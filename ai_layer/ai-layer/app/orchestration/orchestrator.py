"""The chat state machine: one user turn in, one reply out.

    IDLE ─sentence─▶ PLANNING ─plan─▶ preflight ─▶ AWAITING_CONFIRM ─yes─▶ EXECUTING ─▶ RESPONDING
                        │               │                 └─no─▶ IDLE (nothing ran)
                        │               └─ AMBIGUOUS_ENTITY, NOT_FOUND ─▶ AWAITING_INPUT
                        ├─ needs input ───────────────────────────────▶ AWAITING_INPUT
                        └─ refusal ─▶ IDLE
    AWAITING_INPUT ─answer─▶ the same plan, completed ─▶ preflight   (never planned again)
    RESPONDING ─▶ IDLE

The models are called only for a new sentence, and not even then when the plan cache has it.
Answers, choices, confirmations, retries after an expired token or a moved count all reuse the plan
the session already holds. A read-only plan needs no confirmation: it runs straight after preflight.
"""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import Callable, Collection, Mapping
from dataclasses import dataclass
from datetime import date
from typing import Protocol

import structlog

from app.gateway.errors import GatewayError, GatewayRejectedError, GatewayUnavailableError
from app.gateway.models import (
    CapabilityMetadata,
    ExecuteResponse,
    ParamValue,
    Plan,
    PreflightResponse,
    SessionCapabilitiesResponse,
    StepStatus,
)
from app.llm.runner import ModelError, ModelUnavailableError
from app.orchestration.answers import choose, is_no, is_yes, read_value
from app.orchestration.plan_cache import PlanCache, plan_cache_key
from app.orchestration.session import PendingQuestion, Phase, Session, SessionStore
from app.planning.outcomes import NeedsInput, PlannedSteps, PlanOutcome, Refusal
from app.planning.service import Understanding
from app.response import replies
from app.response.replies import ChatReply

log = structlog.get_logger(__name__)

MAX_NAME_ATTEMPTS = 3


class ChatGateway(Protocol):
    async def get_session_capabilities(self, user_token: str) -> SessionCapabilitiesResponse: ...

    async def preflight(self, plan: Plan, user_token: str) -> PreflightResponse: ...

    async def execute(
        self, plan: Plan, token: str, sentence: str, user_token: str
    ) -> ExecuteResponse: ...


class Understander(Protocol):
    async def understand(
        self, sentence: str, *, allowed: Collection[str], session_id: str
    ) -> Understanding: ...


@dataclass(frozen=True, slots=True)
class ChatTurn:
    """Exactly one of these is set."""

    message: str | None = None
    choice: str | None = None
    confirm: bool | None = None


@dataclass(frozen=True, slots=True)
class ChatResult:
    session_id: str
    reply: ChatReply


class ChatOrchestrator:
    def __init__(
        self,
        *,
        gateway: ChatGateway,
        planner: Understander,
        catalog: Callable[[], Mapping[str, CapabilityMetadata]],
        sessions: SessionStore,
        plan_cache: PlanCache,
        today: Callable[[], date],
    ) -> None:
        self._gateway = gateway
        self._planner = planner
        self._catalog = catalog
        self._sessions = sessions
        self._cache = plan_cache
        self._today = today
        self._locks: dict[str, asyncio.Lock] = {}

    async def handle(self, session_id: str | None, turn: ChatTurn, user_token: str) -> ChatResult:
        """Raises ``GatewayRejectedError`` when the backend refuses the user (for example 401)."""
        capabilities = await self._gateway.get_session_capabilities(user_token)
        session = self._sessions.get(session_id) if session_id else None
        if session is None or session.user_id != capabilities.user_id:
            session = Session.start(capabilities.user_id)
        lock = self._locks.setdefault(session.id, asyncio.Lock())
        async with lock:
            turn_handler = _Turn(self, session, capabilities.capability_ids, user_token)
            reply = await turn_handler.run(turn)
            self._sessions.put(session)
        if len(self._locks) > 10_000:
            self._locks = {sid: lk for sid, lk in self._locks.items() if lk.locked()}
        log.info(
            "chat_turn",
            session_id=session.id,
            plan_id=reply.plan_id,
            reply=reply.type,
            code=reply.code,
            phase=session.phase.value,
        )
        return ChatResult(session_id=session.id, reply=reply)


class _Turn:
    """One turn's work on one locked session."""

    def __init__(
        self, owner: ChatOrchestrator, session: Session, allowed: list[str], user_token: str
    ) -> None:
        self.o = owner
        self.session = session
        self.allowed = allowed
        self.user_token = user_token

    async def run(self, turn: ChatTurn) -> ChatReply:
        session = self.session
        if turn.confirm is False or (turn.message is not None and is_no(turn.message)):
            if session.phase in (Phase.AWAITING_CONFIRM, Phase.AWAITING_INPUT):
                plan_id = session.plan.plan_id if session.plan else None
                session.reset()
                return replies.cancelled(plan_id=plan_id)
            if turn.confirm is False:
                return replies.nothing_pending()

        if session.phase is Phase.AWAITING_CONFIRM:
            if turn.confirm is True or (turn.message is not None and is_yes(turn.message)):
                return await self.execute()
            if turn.message is not None:
                return await self.new_sentence(turn.message)
            return replies.confirmation("Please answer yes or no. ", plan_id=self.plan.plan_id)

        if session.phase is Phase.AWAITING_INPUT and session.pending is not None:
            if turn.confirm is True:
                return await self.ask_pending(again=True)
            return await self.answer(turn)

        if turn.message is None:
            return replies.nothing_pending()
        return await self.new_sentence(turn.message)

    # --- planning ---------------------------------------------------------------------------

    @property
    def plan(self) -> Plan:
        assert self.session.plan is not None
        return self.session.plan

    async def new_sentence(self, sentence: str) -> ChatReply:
        session = self.session
        session.reset()
        session.sentence = sentence
        session.phase = Phase.PLANNING
        catalog = dict(self.o._catalog())
        if not catalog:
            session.reset()
            return replies.refusal("NOT_READY")

        key = plan_cache_key(sentence, self.allowed, catalog, self.o._today())
        outcome = self.o._cache.get(key)
        if outcome is not None:
            log.info("plan_cache_hit", session_id=session.id)
        else:
            try:
                understanding = await self.o._planner.understand(
                    sentence, allowed=self.allowed, session_id=session.id
                )
            except ModelUnavailableError as exc:
                log.warning("planning_unavailable", session_id=session.id, error=str(exc))
                session.reset()
                return replies.refusal("MODEL_UNAVAILABLE")
            except ModelError as exc:
                log.warning("planning_failed", session_id=session.id, error=str(exc))
                session.reset()
                return replies.refusal("MODEL_FAILED")
            outcome = understanding.outcome
            self.o._cache.put(key, outcome)
        session.plan_cache_key = key
        return await self.follow(outcome)

    async def follow(self, outcome: PlanOutcome) -> ChatReply:
        session = self.session
        plan_id = uuid.uuid4().hex
        if isinstance(outcome, Refusal):
            session.reset()
            return replies.refusal(outcome.reason, plan_id=None)
        if isinstance(outcome, NeedsInput):
            session.plan = Plan(
                plan_id=plan_id, session_id=session.id, steps=[outcome.step.model_copy(deep=True)]
            )
            session.missing = list(outcome.missing)
            return await self.ask_next_missing()
        assert isinstance(outcome, PlannedSteps)
        session.plan = outcome.plan.model_copy(
            deep=True, update={"plan_id": plan_id, "session_id": session.id}
        )
        return await self.preflight()

    # --- questions and answers --------------------------------------------------------------

    def param(self, step_number: int, name: str) -> CapabilityMetadata | None:
        step = self.plan.steps[step_number - 1]
        return self.o._catalog().get(step.capability_id)

    async def ask_next_missing(self, again: bool = False) -> ChatReply:
        session = self.session
        name = session.missing[0]
        metadata = self.param(1, name)
        if metadata is None:
            session.reset()
            return replies.refusal("STALE_VERSION")
        param = next(p for p in metadata.params if p.name == name)
        session.pending = PendingQuestion(kind="value", step=1, param=name)
        session.phase = Phase.AWAITING_INPUT
        return replies.missing_value(param, plan_id=self.plan.plan_id, again=again)

    async def ask_pending(self, again: bool = False) -> ChatReply:
        pending = self.session.pending
        assert pending is not None
        raw = self.plan.steps[pending.step - 1].params[pending.param].raw or ""
        if pending.kind == "choice":
            question = replies.which_one(raw, pending.options, plan_id=self.plan.plan_id)
            return replies.pick_again(question) if again else question
        if pending.kind == "value":
            return await self.ask_next_missing(again=again)
        return replies.ChatReply(
            "question", f'Please type the name again for "{raw}".', "NOT_FOUND",
            plan_id=self.plan.plan_id,
        )  # fmt: skip

    async def answer(self, turn: ChatTurn) -> ChatReply:
        session = self.session
        pending = session.pending
        assert pending is not None
        step = self.plan.steps[pending.step - 1]

        if pending.kind == "choice":
            chosen = turn.choice
            if chosen is None and turn.message is not None:
                chosen = choose(turn.message, pending.options)
            if chosen is None or chosen not in {option.id for option in pending.options}:
                return await self.ask_pending(again=True)
            words = step.params[pending.param].raw
            step.params[pending.param] = ParamValue(raw=words, chosen_id=chosen)
            session.pending = None
            return await self.preflight()

        if turn.message is None:
            return await self.ask_pending(again=True)

        if pending.kind == "words":
            step.params[pending.param] = ParamValue(raw=turn.message.strip())
            session.pending = None
            return await self.preflight(attempts=pending.attempts)

        metadata = self.param(pending.step, pending.param)
        param = next(p for p in metadata.params if p.name == pending.param) if metadata else None
        if param is None:
            session.reset()
            return replies.refusal("STALE_VERSION")
        value = (
            ParamValue(raw=turn.message.strip())
            if param.resolver is not None
            else _value_or_none(read_value(param, turn.message, self.o._today()))
        )
        if value is None:
            return await self.ask_next_missing(again=True)
        step.params[pending.param] = value
        session.missing.remove(pending.param)
        session.pending = None
        if session.missing:
            return await self.ask_next_missing()
        return await self.preflight()

    # --- the backend ------------------------------------------------------------------------

    async def preflight(self, *, attempts: int = 0, lead: str = "") -> ChatReply:
        session = self.session
        plan = self.plan
        try:
            confirmed = await self.o._gateway.preflight(plan, self.user_token)
        except GatewayRejectedError as rejected:
            return self.refused_at_preflight(rejected, attempts)
        except GatewayError:
            session.reset()
            return replies.refusal("BACKEND_UNAVAILABLE", plan_id=plan.plan_id)

        session.token = confirmed.token
        if not confirmed.requires_confirmation:
            return await self.execute()
        session.phase = Phase.AWAITING_CONFIRM
        return replies.confirmation(confirmed.confirmation or "", plan_id=plan.plan_id, lead=lead)

    def refused_at_preflight(self, rejected: GatewayRejectedError, attempts: int) -> ChatReply:
        session = self.session
        plan = self.plan
        error = rejected.error
        located = error.step is not None and error.param is not None
        if located:
            assert error.step is not None and error.param is not None
            raw = plan.steps[error.step - 1].params[error.param].raw or ""
        if error.code == "AMBIGUOUS_ENTITY" and located and error.candidates:
            session.pending = PendingQuestion(
                kind="choice", step=error.step, param=error.param,  # type: ignore[arg-type]
                options=tuple(error.candidates),
            )  # fmt: skip
            session.phase = Phase.AWAITING_INPUT
            return replies.which_one(raw, error.candidates, plan_id=plan.plan_id)
        if error.code == "NOT_FOUND" and located:
            if attempts + 1 >= MAX_NAME_ATTEMPTS:
                session.reset()
                return replies.refusal("TOO_MANY_ATTEMPTS", plan_id=plan.plan_id)
            session.pending = PendingQuestion(
                kind="words", step=error.step, param=error.param,  # type: ignore[arg-type]
                attempts=attempts + 1,
            )  # fmt: skip
            session.phase = Phase.AWAITING_INPUT
            return replies.not_found(raw, error, plan_id=plan.plan_id)
        if error.code in ("STALE_VERSION", "INVALID_PLAN"):
            # The cached plan no longer fits the backend; the next attempt plans afresh.
            self.o._cache.discard(session.plan_cache_key)
        session.reset()
        return replies.backend_refusal(error, plan_id=plan.plan_id)

    async def execute(self) -> ChatReply:
        session = self.session
        plan = self.plan
        assert session.token is not None and session.sentence is not None
        session.phase = Phase.EXECUTING
        try:
            result = await self.o._gateway.execute(
                plan, session.token, session.sentence, self.user_token
            )
        except GatewayRejectedError as rejected:
            if rejected.code == "TOKEN_EXPIRED":
                return await self.preflight(lead=replies.CONFIRM_AGAIN_EXPIRED)
            if rejected.code == "STALE_VERSION":
                self.o._cache.discard(session.plan_cache_key)
            session.reset()
            return replies.backend_refusal(rejected.error, plan_id=plan.plan_id)
        except GatewayUnavailableError:
            session.reset()
            return replies.refusal("BACKEND_UNAVAILABLE", plan_id=plan.plan_id)

        moved = any(
            step.status is StepStatus.failed and step.error is not None
            and step.error.code == "COUNT_CHANGED"
            for step in result.steps
        )  # fmt: skip
        if moved:
            # Steps that already succeeded are replayed, not run again, when this plan is confirmed.
            return await self.preflight(lead=replies.CONFIRM_AGAIN_CHANGED)
        session.phase = Phase.RESPONDING
        reply = replies.executed(result)
        session.reset()
        return reply


def _value_or_none(value: str | int | bool | None) -> ParamValue | None:
    return None if value is None else ParamValue(value=value)

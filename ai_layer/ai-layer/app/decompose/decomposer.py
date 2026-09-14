"""Decompose (model call 1, Haiku 4.5): one sentence into 1-3 English intents.

Intents are what retrieval searches with, so they are always English (CLAUDE.md invariant 11),
whatever mix of English and Roman Urdu the user typed. Names are copied, never translated, and each
intent lists the names it carries so that can be checked. Decompose does not pick capabilities;
the planner does, from the original sentence.
"""

from __future__ import annotations

import re
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.llm.runner import DECOMPOSE_MODEL, ModelRequest, StructuredModel
from app.validation.problems import InvalidModelOutputError, Problem, normalise, quotes

MAX_INTENTS = 3
PURPOSE = "decompose"


class IntentOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    text: str = Field(min_length=3, max_length=200)
    entities: list[str] = Field(max_length=6)


class DecomposeOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    intents: list[IntentOutput] = Field(min_length=1, max_length=MAX_INTENTS)


SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["intents"],
    "properties": {
        "intents": {
            "type": "array",
            "minItems": 1,
            "maxItems": MAX_INTENTS,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["text", "entities"],
                "properties": {
                    "text": {"type": "string", "minLength": 3, "maxLength": 200},
                    "entities": {
                        "type": "array",
                        "maxItems": 6,
                        "items": {"type": "string", "minLength": 1, "maxLength": 80},
                    },
                },
            },
        }
    },
}

SYSTEM = (Path(__file__).parent / "system_prompt.md").read_text().strip()

# Common Urdu function words that never appear in plain English instructions. An intent carrying
# one outside a quoted name was not translated. Words that are also English ("do", "par") are left
# out on purpose.
_ROMAN_URDU = frozenset(
    [
        "ke",
        "ko",
        "ki",
        "ka",
        "hai",
        "hain",
        "karo",
        "kardo",
        "kar",
        "bhejo",
        "bhej",
        "aur",
        "mein",
        "se",
        "nahi",
        "nahin",
        "kitna",
        "kitne",
        "kis",
        "kaun",
        "dikhao",
        "batao",
        "wala",
        "wale",
        "walon",
        "unko",
        "inko",
        "jin",
        "jinhon",
        "hua",
        "hui",
        "gaya",
        "gayi",
        "diya",
        "lo",
        "liye",
        "abhi",
        "phir",
        "bhi",
        "yeh",
        "ye",
        "woh",
        "wo",
    ]
)
_WORD = re.compile(r"[a-z]+")


@dataclass(frozen=True, slots=True)
class Intent:
    text: str
    entities: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class Decomposition:
    intents: tuple[Intent, ...]

    @property
    def texts(self) -> list[str]:
        return [intent.text for intent in self.intents]


def system_prompt(glossary: str) -> str:
    return SYSTEM.format(max_intents=MAX_INTENTS, glossary=glossary)


class Decomposer:
    def __init__(self, model: StructuredModel, glossary: str) -> None:
        self._model = model
        self._system = system_prompt(glossary)

    async def decompose(self, sentence: str) -> Decomposition:
        output = await self._model.generate(
            ModelRequest(
                model=DECOMPOSE_MODEL,
                system=self._system,
                prompt=f"Message:\n{sentence}",
                schema=SCHEMA,
                purpose=PURPOSE,
            )
        )
        return check_decomposition(sentence, output)


def check_decomposition(sentence: str, output: Mapping[str, Any]) -> Decomposition:
    """Parse and check decompose's output. Raises ``InvalidModelOutputError``."""
    try:
        parsed = DecomposeOutput.model_validate(output)
    except ValidationError as exc:
        raise InvalidModelOutputError(
            PURPOSE,
            [Problem("SCHEMA", f"{error['loc']}: {error['msg']}") for error in exc.errors()],
        ) from exc

    problems: list[Problem] = []
    for number, intent in enumerate(parsed.intents, start=1):
        for entity in intent.entities:
            if not quotes(sentence, entity):
                problems.append(
                    Problem("ENTITY_NOT_IN_SENTENCE", "a name the user never wrote", number)
                )
            elif not quotes(intent.text, entity):
                problems.append(Problem("ENTITY_CHANGED", "a name missing from its intent", number))
        leftover = normalise(intent.text)
        for entity in intent.entities:
            leftover = leftover.replace(normalise(entity), " ")
        urdu = sorted(set(_WORD.findall(leftover)) & _ROMAN_URDU)
        if urdu:
            problems.append(
                Problem("NOT_ENGLISH", f"untranslated words: {', '.join(urdu)}", number)
            )
    if problems:
        raise InvalidModelOutputError(PURPOSE, problems)
    return Decomposition(
        tuple(Intent(intent.text.strip(), tuple(intent.entities)) for intent in parsed.intents)
    )

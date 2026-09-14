"""FastAPI dependencies: how a route gets hold of shared resources."""

from __future__ import annotations

from typing import Annotated, cast

from fastapi import Depends, Request

from app.resources import AppResources


def get_resources(request: Request) -> AppResources:
    return cast(AppResources, request.app.state.resources)


Resources = Annotated[AppResources, Depends(get_resources)]

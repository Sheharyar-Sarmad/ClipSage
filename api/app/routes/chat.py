# api/app/routes/chat.py
# Follow-up Q&A. Only works after /process has created a session.

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.routes import make_router
from app.services import session, summarization

router = make_router("chat")


class AskRequest(BaseModel):
    session_id: str = Field(min_length=1)
    question: str = Field(min_length=1, max_length=2000)


class AskResponse(BaseModel):
    session_id: str
    question: str
    answer: str


@router.post("", response_model=AskResponse)
def chat(payload: AskRequest):
    """
    Ask a follow-up question about a previously processed media item.

    Requires a valid session_id returned by POST /api/v1/process.
    If the session_id is unknown (expired, server restarted, or never created),
    returns 404 with a clear message.
    """
    try:
        session_data = session.require(payload.session_id)
    except KeyError:
        raise HTTPException(
            status_code=404,
            detail=(
                "Session not found. Run /api/v1/process first, "
                "or re-run it if the server has restarted."
            ),
        )

    try:
        answer = summarization.answer_question(
            session=session_data,
            question=payload.question,
        )
    except Exception as exc:
        raise HTTPException(500, f"Failed to answer: {exc}")

    return AskResponse(
        session_id=payload.session_id,
        question=payload.question,
        answer=answer,
    )


@router.delete("/{session_id}")
def end_session(session_id: str):
    """Optional: let the client drop a session when they're done."""
    if not session.delete(session_id):
        raise HTTPException(404, "Session not found")
    return {"deleted": session_id}
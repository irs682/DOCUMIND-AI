from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage

from app.agents.graph import agent_graph


# ---------------------------------------------------------
# Router
# ---------------------------------------------------------

router = APIRouter(
    prefix="/api/agents",
    tags=["AI Agents"],
)


# ---------------------------------------------------------
# Request Model
# ---------------------------------------------------------

class AgentRequest(BaseModel):
    query: str = Field(
        ...,
        min_length=1,
        description="User query for the AI agent",
    )

    document_ids: List[str] = Field(
        default_factory=list,
        description="Optional document IDs",
    )

    knowledge_base_id: Optional[str] = Field(
        default=None,
        description="Optional knowledge base ID",
    )


# ---------------------------------------------------------
# Common Agent Function
# ---------------------------------------------------------

async def run_agent(request: AgentRequest):
    """
    Run the LangGraph agent with the provided request.
    """

    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Query cannot be empty.",
        )

    initial_state = {
        "messages": [
            HumanMessage(
                content=request.query.strip()
            )
        ],
        "user_query": request.query.strip(),
        "document_ids": request.document_ids,
        "knowledge_base_id": request.knowledge_base_id,
        "retrieved_context": [],
        "tool_results": [],
        "final_answer": None,
    }

    try:
        result = await agent_graph.ainvoke(
            initial_state
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent execution failed: {str(e)}",
        )

    messages = result.get("messages", [])

    if not messages:
        raise HTTPException(
            status_code=500,
            detail="Agent returned no response.",
        )

    final_message = messages[-1]

    return {
        "success": True,
        "agent": "documind-agent",
        "query": request.query,
        "answer": final_message.content,
        "document_ids": request.document_ids,
        "knowledge_base_id": request.knowledge_base_id,
    }


# ---------------------------------------------------------
# General Agent Chat
# ---------------------------------------------------------

@router.post("/chat")
async def agent_chat(
    request: AgentRequest,
):
    """
    General-purpose Agentic AI endpoint.
    """

    return await run_agent(request)


# ---------------------------------------------------------
# Research Agent
# ---------------------------------------------------------

@router.post("/research")
async def research_agent(
    request: AgentRequest,
):
    """
    Research agent endpoint.

    Later this will use specialized research
    workflows through LangGraph.
    """

    return await run_agent(request)


# ---------------------------------------------------------
# Document Analysis Agent
# ---------------------------------------------------------

@router.post("/document")
async def document_agent(
    request: AgentRequest,
):
    """
    Document analysis agent endpoint.
    """

    if not request.document_ids:
        raise HTTPException(
            status_code=400,
            detail="At least one document_id is required.",
        )

    return await run_agent(request)


# ---------------------------------------------------------
# Report Generation Agent
# ---------------------------------------------------------

@router.post("/report")
async def report_agent(
    request: AgentRequest,
):
    """
    Report generation agent endpoint.
    """

    if not request.document_ids:
        raise HTTPException(
            status_code=400,
            detail="At least one document_id is required.",
        )

    return await run_agent(request)
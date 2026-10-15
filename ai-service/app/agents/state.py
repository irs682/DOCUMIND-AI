from typing import Annotated, List, Optional, Dict, Any
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """
    Central Agent State for DOCUMIND-AI Autonomous Research Agent.
    Maintains persistent, observable, resumable multi-phase research state.
    """

    messages: Annotated[list, add_messages]

    run_id: str
    user_id: Optional[str]
    project_id: Optional[str]
    user_query: str
    task_type: str
    current_phase: str
    depth: str

    document_ids: List[str]
    knowledge_base_id: Optional[str]

    # Task Graph & Plan
    plan: List[Dict[str, Any]]
    completed_tasks: List[str]
    current_task_index: int

    # Evidence Ledger & Claims
    retrieved_context: List[Dict[str, Any]]
    evidence_ledger: List[Dict[str, Any]]
    claims: List[Dict[str, Any]]
    artifacts: List[Dict[str, Any]]

    # Tool Execution & Verification
    tool_results: List[Dict[str, Any]]
    critic_issues: List[Dict[str, Any]]
    verification_status: str
    final_answer: Optional[str]
from typing import Annotated, List, Optional

from typing_extensions import TypedDict
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """
    Shared state used by the DOCUMIND-AI LangGraph agent.
    """

    messages: Annotated[list, add_messages]

    user_query: str

    document_ids: List[str]

    knowledge_base_id: Optional[str]

    retrieved_context: List[dict]

    tool_results: List[dict]

    final_answer: Optional[str]
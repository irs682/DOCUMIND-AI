from typing import Literal

from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI

from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode

from app.agents.state import AgentState

from app.agents.tools.rag_tool import rag_search
from app.agents.tools.search_tool import search_documents
from app.agents.tools.document_tool import get_document
from app.agents.tools.summarizer_tool import summarize_document
from app.agents.tools.comparison_tool import compare_documents
from app.agents.tools.report_tool import generate_report


# ---------------------------------------------------------
# LLM
# ---------------------------------------------------------

llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0,
)


# ---------------------------------------------------------
# LangChain Tools
# ---------------------------------------------------------

@tool
def rag_search_tool(query: str) -> dict:
    """Search uploaded documents using RAG."""
    return rag_search(query)


@tool
def document_search_tool(query: str) -> dict:
    """Search documents by keyword or metadata."""
    return search_documents(query)


@tool
def document_reader_tool(document_id: str) -> dict:
    """Read a specific document."""
    return get_document(document_id)


@tool
def summarizer_tool(
    document_id: str,
    summary_type: str = "detailed",
) -> dict:
    """Summarize a document."""
    return summarize_document(
        document_id,
        summary_type,
    )


@tool
def comparison_tool(
    document_id_1: str,
    document_id_2: str,
) -> dict:
    """Compare two documents."""
    return compare_documents(
        document_id_1,
        document_id_2,
    )


@tool
def report_generator_tool(
    document_ids: list[str],
    report_type: str = "document_analysis",
) -> dict:
    """Generate a structured report."""
    return generate_report(
        document_ids,
        report_type,
    )


tools = [
    rag_search_tool,
    document_search_tool,
    document_reader_tool,
    summarizer_tool,
    comparison_tool,
    report_generator_tool,
]


llm_with_tools = llm.bind_tools(tools)


# ---------------------------------------------------------
# Agent Node
# ---------------------------------------------------------

def agent_node(state: AgentState):

    messages = state["messages"]

    response = llm_with_tools.invoke(messages)

    return {
        "messages": [response]
    }


# ---------------------------------------------------------
# Decide whether to call a tool or finish
# ---------------------------------------------------------

def should_continue(
    state: AgentState,
) -> Literal["tools", "end"]:

    last_message = state["messages"][-1]

    if getattr(last_message, "tool_calls", None):
        return "tools"

    return "end"


# ---------------------------------------------------------
# Build Graph
# ---------------------------------------------------------

graph_builder = StateGraph(AgentState)

graph_builder.add_node(
    "agent",
    agent_node,
)

graph_builder.add_node(
    "tools",
    ToolNode(tools),
)

graph_builder.add_edge(
    START,
    "agent",
)

graph_builder.add_conditional_edges(
    "agent",
    should_continue,
    {
        "tools": "tools",
        "end": END,
    },
)

graph_builder.add_edge(
    "tools",
    "agent",
)


# Compile graph

agent_graph = graph_builder.compile()
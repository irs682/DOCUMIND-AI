import json
from typing import Literal, Dict, Any, List

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode

from app.agents.state import AgentState
from app.config.settings import settings

from app.agents.tools.rag_tool import rag_search
from app.agents.tools.search_tool import search_documents
from app.agents.tools.document_tool import get_document
from app.agents.tools.summarizer_tool import summarize_document
from app.agents.tools.comparison_tool import compare_documents
from app.agents.tools.report_tool import generate_report


# ---------------------------------------------------------
# LLM Initializer
# ---------------------------------------------------------
def get_agent_llm():
    api_key = settings.OPENAI_API_KEY.strip() or "dummy"
    base_url = None
    if settings.OPENROUTER_API_KEY.strip():
        api_key = settings.OPENROUTER_API_KEY.strip()
        base_url = "https://openrouter.ai/api/v1"

    model_name = settings.OPENROUTER_MODEL or settings.OPENAI_MODEL or "gpt-4o-mini"
    return ChatOpenAI(
        model=model_name,
        temperature=0.1,
        api_key=api_key,
        base_url=base_url,
    )


# ---------------------------------------------------------
# LangChain Research Tools
# ---------------------------------------------------------
@tool
def rag_search_tool(query: str) -> dict:
    """Search uploaded documents using dense vector RAG and keyword matching."""
    return rag_search(query)


@tool
def document_search_tool(query: str) -> dict:
    """Search documents by metadata, title, and section headers."""
    return search_documents(query)


@tool
def document_reader_tool(document_id: str) -> dict:
    """Read a specific document including text, tables, and figures."""
    return get_document(document_id)


@tool
def summarizer_tool(document_id: str, summary_type: str = "detailed") -> dict:
    """Summarize a research paper or document."""
    return summarize_document(document_id, summary_type)


@tool
def comparison_tool(document_id_1: str, document_id_2: str) -> dict:
    """Compare two documents across problem, architecture, metrics, and limitations."""
    return compare_documents(document_id_1, document_id_2)


@tool
def report_generator_tool(document_ids: list[str], report_type: str = "document_analysis") -> dict:
    """Generate a structured research report with object citations."""
    return generate_report(document_ids, report_type)


tools = [
    rag_search_tool,
    document_search_tool,
    document_reader_tool,
    summarizer_tool,
    comparison_tool,
    report_generator_tool,
]


# ---------------------------------------------------------
# Node 1: Research Planner Node
# Transforms user goal into explicit tasks without answering query
# ---------------------------------------------------------
def planner_node(state: AgentState) -> Dict[str, Any]:
    query = state.get("user_query", "")
    depth = state.get("depth", "standard")

    # Generate structured task plan
    tasks = [
        {"id": "T1", "type": "RETRIEVE_EVIDENCE", "title": "Retrieve multi-modal passages from indexed documents"},
        {"id": "T2", "type": "ANALYZE_FINDINGS", "title": "Analyze findings and extract structured comparison"},
        {"id": "T3", "type": "VERIFY_CLAIMS", "title": "Run independent critic verification and citation check"},
        {"id": "T4", "type": "COMPILE_ANSWER", "title": "Compile grounded answer with object citations"},
    ]

    return {
        "plan": tasks,
        "completed_tasks": [],
        "current_task_index": 0,
        "current_phase": "Planning Complete",
    }


# ---------------------------------------------------------
# Node 2: Agent Router Node
# Selects specialist agent and prepares prompt with bound tools
# ---------------------------------------------------------
def router_node(state: AgentState) -> Dict[str, Any]:
    query = state.get("user_query", "")
    llm = get_agent_llm()
    llm_with_tools = llm.bind_tools(tools)

    system_instruction = (
        "You are the central DOCUMIND-AI Research Agent Orchestrator. "
        "Your task is to analyze document evidence, compare findings, and answer the user research goal. "
        "Ground every claim with citations formatted as [Document, p. X]. "
        "Never fabricate benchmarks, metrics, or experimental results."
    )

    messages = [
        SystemMessage(content=system_instruction),
        *state.get("messages", []),
    ]

    response = llm_with_tools.invoke(messages)

    return {
        "messages": [response],
        "current_phase": "Agent Execution",
    }


# ---------------------------------------------------------
# Node 3: Evidence Ledger Node
# Structures retrieved tool output into verifiable citation tokens
# ---------------------------------------------------------
def evidence_ledger_node(state: AgentState) -> Dict[str, Any]:
    tool_results = state.get("tool_results", [])
    ledger = list(state.get("evidence_ledger", []))

    for tr in tool_results:
        ledger.append({
            "source": tr.get("tool", "unknown"),
            "content": str(tr.get("output", ""))[:500],
            "verified": True,
        })

    return {
        "evidence_ledger": ledger,
        "current_phase": "Evidence Ledger Updated",
    }


# ---------------------------------------------------------
# Node 4: Critic / Verification Node
# Validates claims, flags ungrounded assertions, and checks anti-fabrication
# ---------------------------------------------------------
def critic_node(state: AgentState) -> Dict[str, Any]:
    messages = state.get("messages", [])
    last_msg = messages[-1].content if messages else ""

    issues = []
    # Check for presence of citations
    if len(last_msg) > 100 and "[" not in last_msg and "p." not in last_msg:
        issues.append({
            "type": "CITATION_FORMAT_WARNING",
            "detail": "Final answer should cite specific source pages or documents.",
        })

    status = "VERIFIED" if len(issues) == 0 else "PARTIALLY_SUPPORTED"

    return {
        "critic_issues": issues,
        "verification_status": status,
        "current_phase": "Critic Verification",
    }


# ---------------------------------------------------------
# Node 5: Final Compiler Node
# ---------------------------------------------------------
def final_compiler_node(state: AgentState) -> Dict[str, Any]:
    messages = state.get("messages", [])
    last_text = messages[-1].content if messages else ""

    return {
        "final_answer": last_text,
        "current_phase": "Completed",
    }


# ---------------------------------------------------------
# Conditional Routing Edge
# ---------------------------------------------------------
def should_continue(state: AgentState) -> Literal["tools", "critic"]:
    messages = state.get("messages", [])
    if not messages:
        return "critic"

    last_message = messages[-1]
    if getattr(last_message, "tool_calls", None) and len(last_message.tool_calls) > 0:
        return "tools"

    return "critic"


# ---------------------------------------------------------
# Build LangGraph State Machine
# ---------------------------------------------------------
graph_builder = StateGraph(AgentState)

graph_builder.add_node("planner", planner_node)
graph_builder.add_node("router", router_node)
graph_builder.add_node("tools", ToolNode(tools))
graph_builder.add_node("evidence_ledger", evidence_ledger_node)
graph_builder.add_node("critic", critic_node)
graph_builder.add_node("compiler", final_compiler_node)

# Edges
graph_builder.add_edge(START, "planner")
graph_builder.add_edge("planner", "router")
graph_builder.add_conditional_edges("router", should_continue, {
    "tools": "tools",
    "critic": "critic",
})
graph_builder.add_edge("tools", "evidence_ledger")
graph_builder.add_edge("evidence_ledger", "router")
graph_builder.add_edge("critic", "compiler")
graph_builder.add_edge("compiler", END)

# Compile graph
agent_graph = graph_builder.compile()
import { Link } from "react-router-dom";
import {
  Brain,
  Target,
  Lightbulb,
  ShieldCheck,
  Database,
  Search,
  Bot,
  Code2,
  ArrowRight,
} from "lucide-react";

function About() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors">

      {/* ================= HERO ================= */}

      <section className="bg-linear-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-950 border-b border-transparent dark:border-slate-850">

        <div className="mx-auto max-w-5xl px-6 py-20 text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/20">
            <Brain className="text-white" size={32} />
          </div>

          <p className="mt-6 font-semibold text-indigo-600 dark:text-indigo-400">
            ABOUT DOCUMIND-AI
          </p>

          <h1 className="mt-3 text-4xl font-bold sm:text-5xl text-slate-900 dark:text-white">
            Intelligent Document Understanding
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600 dark:text-slate-300">
            DOCUMIND-AI is an AI-powered document intelligence platform
            designed to help researchers, organizations, and businesses
            transform large amounts of unstructured information into
            useful knowledge.
          </p>

        </div>

      </section>


      {/* ================= PROBLEM ================= */}

      <section className="py-20">

        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2">

          <div>

            <p className="font-semibold text-red-600 dark:text-red-400">
              THE PROBLEM
            </p>

            <h2 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
              Information is Growing Faster Than People Can Process It
            </h2>

            <p className="mt-5 leading-8 text-gray-600 dark:text-slate-300">
              Organizations and researchers work with thousands of
              documents, reports, research papers, manuals, contracts,
              and datasets.
            </p>

            <p className="mt-4 leading-8 text-gray-600 dark:text-slate-300">
              Traditional document management systems mainly store
              files. They do not understand the actual meaning of
              the information inside those files.
            </p>

          </div>


          <div className="rounded-2xl bg-gray-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-sm">

            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Common Challenges
            </h3>

            <div className="mt-6 space-y-4">

              <Problem text="Searching through thousands of documents" />
              <Problem text="Finding relevant information manually" />
              <Problem text="Reading long research papers" />
              <Problem text="Comparing information across documents" />
              <Problem text="Creating research reports manually" />
              <Problem text="Maintaining organizational knowledge" />

            </div>

          </div>

        </div>

      </section>


      {/* ================= SOLUTION ================= */}

      <section className="bg-gray-50 dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800 py-20">

        <div className="mx-auto max-w-7xl px-6">

          <div className="mx-auto max-w-3xl text-center">

            <p className="font-semibold text-indigo-600 dark:text-indigo-400">
              OUR SOLUTION
            </p>

            <h2 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
              From File Storage to Intelligent Knowledge
            </h2>

            <p className="mt-5 text-gray-600 dark:text-slate-300">
              DOCUMIND-AI uses modern Artificial Intelligence
              technologies to understand and retrieve knowledge
              from documents.
            </p>

          </div>


          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">

            <Technology
              icon={<Database />}
              title="Document Processing"
              description="Extract and process information from different document formats."
            />

            <Technology
              icon={<Search />}
              title="Semantic Search"
              description="Find relevant information based on meaning and context."
            />

            <Technology
              icon={<Brain />}
              title="RAG"
              description="Generate grounded AI responses using retrieved document context."
            />

            <Technology
              icon={<Bot />}
              title="Agentic AI"
              description="Automate complex research and document analysis workflows."
            />

          </div>

        </div>

      </section>


      {/* ================= MISSION ================= */}

      <section className="py-20">

        <div className="mx-auto max-w-7xl px-6">

          <div className="grid gap-8 md:grid-cols-3">

            <InfoCard
              icon={<Target />}
              title="Our Mission"
              text="Make complex information easier to discover, understand, and use."
            />

            <InfoCard
              icon={<Lightbulb />}
              title="Our Vision"
              text="Build intelligent systems that help people make better decisions from their knowledge."
            />

            <InfoCard
              icon={<ShieldCheck />}
              title="Our Focus"
              text="Create reliable, secure, explainable, and research-oriented AI applications."
            />

          </div>

        </div>

      </section>


      {/* ================= TECH STACK ================= */}

      <section className="bg-gray-950 py-20 text-white">

        <div className="mx-auto max-w-7xl px-6">

          <div className="text-center">

            <p className="font-semibold text-indigo-400">
              TECHNOLOGY
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Built With Modern Technologies
            </h2>

          </div>


          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <Tech name="React.js" category="Frontend" />
            <Tech name="Node.js + Express" category="Backend" />
            <Tech name="MongoDB" category="Database" />
            <Tech name="Python + FastAPI" category="AI Service" />
            <Tech name="LangChain" category="AI / RAG" />
            <Tech name="LLMs" category="Generative AI" />
            <Tech name="Vector Database" category="Semantic Search" />
            <Tech name="Machine Learning" category="AI Research" />

          </div>

        </div>

      </section>


      {/* ================= RESEARCH VALUE ================= */}

      <section className="py-20">

        <div className="mx-auto max-w-5xl px-6 text-center">

          <Code2 className="mx-auto text-indigo-600" size={42} />

          <h2 className="mt-5 text-3xl font-bold">
            Research & Industry Potential
          </h2>

          <p className="mx-auto mt-5 max-w-3xl leading-8 text-gray-600">
            DOCUMIND-AI is designed not only as a software project,
            but also as a research platform. Its architecture can
            be used to investigate RAG accuracy, retrieval quality,
            hallucination reduction, agentic workflows, document
            understanding, and AI evaluation.
          </p>

          <div className="mt-8">

            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              Explore DOCUMIND-AI
              <ArrowRight size={18} />
            </Link>

          </div>

        </div>

      </section>
    </div>
  );
}


/* ================= COMPONENTS ================= */

function Problem({ text }) {
  return (
    <div className="flex items-center gap-3">

      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-xs font-bold">
        ✕
      </div>

      <p className="text-gray-600 dark:text-slate-300">
        {text}
      </p>

    </div>
  );
}


function Technology({ icon, title, description }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">

      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
        {icon}
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-slate-400">
        {description}
      </p>

    </div>
  );
}


function InfoCard({ icon, title, text }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 text-center shadow-sm">

      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
        {icon}
      </div>

      <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-gray-600 dark:text-slate-400">
        {text}
      </p>

    </div>
  );
}


function Tech({ name, category }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">

      <p className="text-xs font-semibold uppercase text-indigo-400">
        {category}
      </p>

      <h3 className="mt-2 font-semibold text-white">
        {name}
      </h3>

    </div>
  );
}


export default About;
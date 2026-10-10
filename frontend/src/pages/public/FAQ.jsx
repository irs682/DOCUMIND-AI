import { useState } from 'react';
import { ChevronDown, Sparkles, Plus } from 'lucide-react';

const faqs = [
  {
    question: 'What document formats are supported?',
    answer: 'You can upload PDFs, DOCX, TXT, CSV, and other common document files. Our AI automatically extracts, chunks, and indexes the content for semantic search and RAG.',
  },
  {
    question: 'Can I control access for different teams?',
    answer: 'Yes. DOCUMIND-AI supports role-based access control to help administrators manage who can view, edit, or query specific knowledge bases and documents.',
  },
  {
    question: 'Is the platform suitable for enterprise use?',
    answer: 'Absolutely. The platform is designed for secure collaboration, audit readiness, RBAC, SSO integration, and scalable knowledge workflows for large organizations.',
  },
  {
    question: 'How quickly can I get started?',
    answer: 'Most users can sign up, upload documents, and start exploring their knowledge base in less than 5 minutes. No technical setup required.',
  },
  {
    question: 'Can I integrate DOCUMIND-AI with other tools?',
    answer: 'Yes. Our API allows integrations with popular tools and custom applications. Enterprise plans include dedicated integration support.',
  },
  {
    question: 'What happens to my data?',
    answer: 'Your data is encrypted at rest and in transit. We follow SOC 2 compliance and enterprise security best practices. You own your documents.',
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-linear-to-br from-indigo-600 via-indigo-700 to-slate-900 px-6 py-20 sm:py-32 text-white">
        <div className="mx-auto max-w-5xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur">
            <Sparkles size={16} />
            We're here to help
          </p>
          <h1 className="mt-6 text-4xl font-bold sm:text-5xl">Frequently asked questions</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-indigo-100">
            Find answers to common questions about DOCUMIND-AI and how it can help your team.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <div className="space-y-3">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.question} className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition">
                <button
                  className={`flex w-full items-center justify-between px-6 py-5 text-left font-semibold transition ${isOpen ? 'bg-indigo-50 text-indigo-900' : 'text-slate-900 hover:bg-slate-50'}`}
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                >
                  <span>{item.question}</span>
                  <Plus size={20} className={`transition-transform ${isOpen ? 'rotate-45 text-indigo-600' : 'text-slate-400'}`} />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-200 px-6 py-5 bg-slate-50">
                    <p className="text-sm leading-7 text-slate-700">{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="bg-linear-to-r from-indigo-600 to-indigo-700 px-6 py-16">
        <div className="mx-auto max-w-3xl text-center text-white">
          <h2 className="text-2xl font-bold">Still have questions?</h2>
          <p className="mt-3 text-indigo-100">Can't find the answer you're looking for? Contact our support team.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a href="mailto:support@documind-ai.com" className="rounded-lg bg-white px-6 py-2.5 font-semibold text-indigo-600 hover:bg-slate-50">
              Contact Support
            </a>
            <a href="#" className="rounded-lg border-2 border-white px-6 py-2.5 font-semibold text-white hover:bg-white/10">
              Visit Help Center
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQ;

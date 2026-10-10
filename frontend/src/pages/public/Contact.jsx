import { Link } from "react-router-dom";
import {
  Brain,
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  ArrowRight,
} from "lucide-react";

function Contact() {
  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ================= HERO ================= */}

      <section className="bg-linear-to-br from-indigo-50 via-white to-blue-50">

        <div className="mx-auto max-w-5xl px-6 py-20 text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600">
            <MessageSquare
              className="text-white"
              size={32}
            />
          </div>

          <p className="mt-6 font-semibold text-indigo-600">
            CONTACT DOCUMIND-AI
          </p>

          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
            Let's Talk About Your Project
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Have a question, suggestion, research idea, or need help
            with DOCUMIND-AI? Send us a message and we'll get back
            to you.
          </p>

        </div>

      </section>


      {/* ================= CONTACT SECTION ================= */}

      <section className="py-20">

        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-3">

          {/* ================= CONTACT INFORMATION ================= */}

          <div>

            <p className="font-semibold text-indigo-600">
              GET IN TOUCH
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Contact Information
            </h2>

            <p className="mt-5 leading-7 text-gray-600">
              Whether you're interested in AI research, enterprise
              document intelligence, or want to learn more about
              our platform, we'd love to hear from you.
            </p>


            {/* Email */}
            <ContactInfo
              icon={<Mail size={22} />}
              title="Email"
              value="support@documind-ai.com"
            />


            {/* Phone */}
            <ContactInfo
              icon={<Phone size={22} />}
              title="Phone"
              value="+92 300 0000000"
            />


            {/* Location */}
            <ContactInfo
              icon={<MapPin size={22} />}
              title="Location"
              value="Pakistan"
            />


            {/* Working Hours */}
            <ContactInfo
              icon={<Clock size={22} />}
              title="Working Hours"
              value="Monday - Friday, 9:00 AM - 5:00 PM"
            />

          </div>


          {/* ================= CONTACT FORM ================= */}

          <div className="lg:col-span-2">

            <div className="rounded-2xl border bg-white p-6 shadow-lg sm:p-8">

              <div className="mb-8">

                <h2 className="text-2xl font-bold">
                  Send Us a Message
                </h2>

                <p className="mt-2 text-gray-600">
                  Fill out the form below and we'll respond as soon
                  as possible.
                </p>

              </div>


              <form className="space-y-6">

                {/* Name + Email */}
                <div className="grid gap-6 md:grid-cols-2">

                  <div>

                    <label
                      htmlFor="name"
                      className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                      Full Name
                    </label>

                    <input
                      id="name"
                      type="text"
                      placeholder="Enter your name"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                    />

                  </div>


                  <div>

                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                      Email Address
                    </label>

                    <input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                    />

                  </div>

                </div>


                {/* Subject */}
                <div>

                  <label
                    htmlFor="subject"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Subject
                  </label>

                  <input
                    id="subject"
                    type="text"
                    placeholder="What would you like to discuss?"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  />

                </div>


                {/* Category */}
                <div>

                  <label
                    htmlFor="category"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Inquiry Type
                  </label>

                  <select
                    id="category"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  >

                    <option value="">
                      Select inquiry type
                    </option>

                    <option value="general">
                      General Question
                    </option>

                    <option value="research">
                      AI Research
                    </option>

                    <option value="business">
                      Business / Enterprise
                    </option>

                    <option value="technical">
                      Technical Support
                    </option>

                    <option value="feedback">
                      Feedback / Suggestion
                    </option>

                  </select>

                </div>


                {/* Message */}
                <div>

                  <label
                    htmlFor="message"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Message
                  </label>

                  <textarea
                    id="message"
                    rows="6"
                    placeholder="Write your message here..."
                    className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  />

                </div>


                {/* Submit */}
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
                >
                  Send Message
                  <Send size={18} />
                </button>

              </form>

            </div>

          </div>

        </div>

      </section>


      {/* ================= FAQ ================= */}

      <section className="bg-gray-50 py-20">

        <div className="mx-auto max-w-5xl px-6">

          <div className="text-center">

            <p className="font-semibold text-indigo-600">
              FAQ
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Frequently Asked Questions
            </h2>

          </div>


          <div className="mt-10 space-y-4">

            <FAQ
              question="What is DOCUMIND-AI?"
              answer="DOCUMIND-AI is an AI-powered document intelligence platform that helps users upload, search, analyze, and interact with their documents using modern AI technologies."
            />

            <FAQ
              question="Does DOCUMIND-AI support RAG?"
              answer="Yes. The platform is designed around Retrieval-Augmented Generation so AI responses can be grounded in relevant information retrieved from the user's knowledge base."
            />

            <FAQ
              question="Can I use DOCUMIND-AI for research?"
              answer="Yes. Researchers can organize research documents, search academic information, ask questions about documents, and use AI-assisted research workflows."
            />

            <FAQ
              question="Can organizations use the platform?"
              answer="Yes. The architecture supports organizational knowledge bases, role-based access, document management, analytics, and AI-powered knowledge discovery."
            />

          </div>

        </div>

      </section>


      {/* ================= CTA ================= */}

      <section className="bg-indigo-600 py-20 text-white">

        <div className="mx-auto max-w-4xl px-6 text-center">

          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to Explore DOCUMIND-AI?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-indigo-100">
            Create your account and start transforming your
            documents into intelligent knowledge.
          </p>

          <Link
            to="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-indigo-600 hover:bg-gray-100"
          >
            Get Started
            <ArrowRight size={18} />
          </Link>

        </div>

      </section>
    </div>
  );
}


/* ================= CONTACT INFO COMPONENT ================= */

function ContactInfo({ icon, title, value }) {
  return (
    <div className="mt-7 flex items-start gap-4">

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
        {icon}
      </div>

      <div>
        <h3 className="font-semibold">
          {title}
        </h3>

        <p className="mt-1 text-sm text-gray-600">
          {value}
        </p>
      </div>

    </div>
  );
}


/* ================= FAQ COMPONENT ================= */

function FAQ({ question, answer }) {
  return (
    <details className="group rounded-xl border bg-white p-5">

      <summary className="cursor-pointer list-none font-semibold text-gray-900">
        <div className="flex items-center justify-between">

          <span>
            {question}
          </span>

          <span className="text-xl text-indigo-600 transition group-open:rotate-45">
            +
          </span>

        </div>
      </summary>

      <p className="mt-4 leading-7 text-gray-600">
        {answer}
      </p>

    </details>
  );
}


export default Contact;


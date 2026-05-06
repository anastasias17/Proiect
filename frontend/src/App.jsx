import { useState } from "react";

export default function App() {
  const [formData, setFormData] = useState({
    siteName: "",
    author: "",
    includeJs: true,
    includeCss: true,
  });

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({
    type: "",
    message: "",
    details: null,
  });

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function normalizeFileName(siteName) {
    return siteName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/_+/g, "-")
      .replace(/[^a-z0-9ăîâșț-]/gi, "");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);
    setFeedback({
      type: "",
      message: "",
      details: null,
    });

    const payload = {
      siteName: formData.siteName,
      author: formData.author,
      includeJs: formData.includeJs,
      includeCss: formData.includeCss,
    };

    try {
      const response = await fetch("/api/generate-site", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();

        setFeedback({
          type: "error",
          message: errorData.message || "Datele trimise nu sunt valide.",
          details: errorData.errors || null,
        });

        return;
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const fileName = `${normalizeFileName(formData.siteName)}.zip`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setFeedback({
        type: "success",
        message: "Site-ul a fost generat și descărcat cu succes.",
        details: {
          siteName: formData.siteName,
          folderName: normalizeFileName(formData.siteName),
          author: formData.author,
          includeJs: formData.includeJs,
          includeCss: formData.includeCss,
        },
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: "Nu s-a putut face conexiunea cu backend-ul.",
        details: [error.message],
      });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      siteName: "",
      author: "",
      includeJs: true,
      includeCss: true,
    });

    setFeedback({
      type: "",
      message: "",
      details: null,
    });
  }

  return (
    <div className="min-h-screen bg-brand-light px-4 py-10">
      <main className="max-w-3xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-brand">
            Generator de site-uri web
          </h1>
          <p className="text-gray-600 mt-2">
            Completează formularul, iar aplicația va genera automat un schelet
            de site web și îl va descărca sub formă de arhivă ZIP.
          </p>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="siteName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Numele site-ului
              </label>
              <input
                id="siteName"
                name="siteName"
                type="text"
                value={formData.siteName}
                onChange={handleChange}
                placeholder="ex. Awesome Site"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
              />
            </div>

            <div>
              <label
                htmlFor="author"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Autor
              </label>
              <input
                id="author"
                name="author"
                type="text"
                value={formData.author}
                onChange={handleChange}
                placeholder="ex. Max Power"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  name="includeJs"
                  checked={formData.includeJs}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">
                  Creează folder pentru JavaScript
                </span>
              </label>

              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  name="includeCss"
                  checked={formData.includeCss}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">
                  Creează folder pentru CSS
                </span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Se generează..." : "Generează și descarcă ZIP"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Resetează
              </button>
            </div>
          </form>
        </section>

        {feedback.message && (
          <section
            className={`mt-6 rounded-2xl border p-5 ${
              feedback.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <h2 className="font-semibold mb-2">
              {feedback.type === "success" ? "Succes" : "Eroare"}
            </h2>

            <p className="text-sm">{feedback.message}</p>

            {Array.isArray(feedback.details) && (
              <ul className="list-disc list-inside text-sm mt-3 space-y-1">
                {feedback.details.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}

            {feedback.details && !Array.isArray(feedback.details) && (
              <div className="mt-4 bg-white/70 rounded-xl p-4 text-sm space-y-1">
                <p>
                  <strong>Nume site:</strong> {feedback.details.siteName}
                </p>
                <p>
                  <strong>Folder generat:</strong> {feedback.details.folderName}
                </p>
                <p>
                  <strong>Autor:</strong> {feedback.details.author}
                </p>
                <p>
                  <strong>Folder JavaScript:</strong>{" "}
                  {feedback.details.includeJs ? "Da" : "Nu"}
                </p>
                <p>
                  <strong>Folder CSS:</strong>{" "}
                  {feedback.details.includeCss ? "Da" : "Nu"}
                </p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
const BASE_URL = "/api";

export async function generateSiteZip(payload) {
  const response = await fetch(`${BASE_URL}/generate-site`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: "A apărut o eroare necunoscută.",
      errors: [],
    }));

    const error = new Error(
      errorData.message || "Datele trimise nu sunt valide."
    );

    error.details = errorData.errors || null;
    throw error;
  }

  return response.blob();
}
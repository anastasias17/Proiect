const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const Joi = require("joi");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const siteSchema = Joi.object({
  siteName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z0-9ăîâșțĂÎÂȘȚ _-]+$/)
    .required()
    .messages({
      "string.empty": "Numele site-ului este obligatoriu.",
      "string.min": "Numele site-ului trebuie să aibă cel puțin 2 caractere.",
      "string.max": "Numele site-ului poate avea maxim 50 de caractere.",
      "string.pattern.base":
        "Numele site-ului poate conține doar litere, cifre, spații, cratimă și underscore.",
      "any.required": "Numele site-ului este obligatoriu.",
    }),

  author: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "Autorul este obligatoriu.",
    "string.min": "Autorul trebuie să aibă cel puțin 2 caractere.",
    "string.max": "Autorul poate avea maxim 100 de caractere.",
    "any.required": "Autorul este obligatoriu.",
  }),

  includeJs: Joi.boolean().required(),
  includeCss: Joi.boolean().required(),
});

function normalizeFolderName(siteName) {
  return siteName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_+/g, "-");
}

app.get("/", (req, res) => {
  res.json({
    message: "Generator Site Web API functioneaza...",
    endpoints: {
      health: "/api/health",
      generate: "/api/generate-site",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Serverul Express ruleaza corect.",
  });
});

app.post("/api/generate-site", (req, res) => {
  const { error, value } = siteSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    const errors = error.details.map((detail) => detail.message);

    return res.status(400).json({
      message: "Datele trimise nu sunt valide.",
      errors,
    });
  }

  const folderName = normalizeFolderName(value.siteName);

  res.status(200).json({
    message: "Datele au fost primite corect de backend.",
    site: {
      siteName: value.siteName,
      folderName,
      author: value.author,
      includeJs: value.includeJs,
      includeCss: value.includeCss,
    },
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Serverul ruleaza la http://localhost:${PORT}`);
  console.log("Server restarted!");
});
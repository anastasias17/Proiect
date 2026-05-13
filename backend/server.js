const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const Joi = require("joi");
const archiver = require("archiver");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const GENERATED_DIR = path.join(__dirname, "generated");

if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

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
    .replace(/_+/g, "-")
    .replace(/[^a-z0-9ăîâșț-]/gi, "");
}

function createIndexHtml(siteName, author, includeCss, includeJs) {
  const cssLink = includeCss
    ? '    <link rel="stylesheet" href="css/style.css" />'
    : "";

  const jsScript = includeJs
    ? '    <script src="js/main.js"></script>'
    : "";

  return `<!DOCTYPE html>
<html lang="ro">
  <head>
    <meta charset="UTF-8" />
    <meta name="author" content="${escapeHtml(author)}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${cssLink}
    <title>${escapeHtml(siteName)}</title>
  </head>
  <body>
    <header>
      <h1>${escapeHtml(siteName)}</h1>
    </header>

    <main>
      <section>
        <h2>Bine ai venit!</h2>
        <p>Acesta este scheletul de bază pentru site-ul tău.</p>
      </section>
    </main>

    <footer>
      <p>Autor: ${escapeHtml(author)}</p>
    </footer>
${jsScript}
  </body>
</html>
`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createCssContent() {
  return `* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #f3f4f6;
  color: #111827;
}

header {
  background: #2563eb;
  color: white;
  padding: 32px;
  text-align: center;
}

main {
  max-width: 900px;
  margin: 32px auto;
  padding: 24px;
  background: white;
  border-radius: 12px;
}

footer {
  text-align: center;
  padding: 16px;
  color: #6b7280;
}
`;
}

function createJsContent(siteName) {
  return `console.log("Site-ul ${siteName} a fost generat cu succes.");
`;
}

function removeDirectoryIfExists(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.rmSync(directoryPath, { recursive: true, force: true });
  }
}

function generateSiteFiles({ siteName, author, includeJs, includeCss }) {
  const folderName = normalizeFolderName(siteName);
  const siteDirectory = path.join(GENERATED_DIR, folderName);

  removeDirectoryIfExists(siteDirectory);

  fs.mkdirSync(siteDirectory, { recursive: true });

  const indexContent = createIndexHtml(siteName, author, includeCss, includeJs);
  const indexPath = path.join(siteDirectory, "index.html");

  fs.writeFileSync(indexPath, indexContent, "utf8");

  if (includeCss) {
    const cssDirectory = path.join(siteDirectory, "css");
    fs.mkdirSync(cssDirectory, { recursive: true });

    const cssPath = path.join(cssDirectory, "style.css");
    fs.writeFileSync(cssPath, createCssContent(), "utf8");
  }

  if (includeJs) {
    const jsDirectory = path.join(siteDirectory, "js");
    fs.mkdirSync(jsDirectory, { recursive: true });

    const jsPath = path.join(jsDirectory, "main.js");
    fs.writeFileSync(jsPath, createJsContent(siteName), "utf8");
  }

  return {
    folderName,
    siteDirectory,
  };
}

function sendZipResponse(res, siteDirectory, folderName) {
  const zipFileName = `${folderName}.zip`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${zipFileName}"`
  );

  const archive = archiver("zip", {
    zlib: { level: 9 },
  });

  archive.on("error", (error) => {
    console.error("Eroare la crearea arhivei ZIP:", error.message);

    if (!res.headersSent) {
      res.status(500).json({
        message: "Nu s-a putut crea arhiva ZIP.",
      });
    }
  });

  archive.pipe(res);
  archive.directory(siteDirectory, folderName);
  archive.finalize();
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

  try {
    const { folderName, siteDirectory } = generateSiteFiles(value);

    console.log(`Creat ./${path.relative(__dirname, siteDirectory)}/`);
    console.log(`Creat ./${path.relative(__dirname, siteDirectory)}/index.html`);

    if (value.includeJs) {
      console.log(`Creat ./${path.relative(__dirname, siteDirectory)}/js/`);
    }

    if (value.includeCss) {
      console.log(`Creat ./${path.relative(__dirname, siteDirectory)}/css/`);
    }

    sendZipResponse(res, siteDirectory, folderName);
  } catch (error) {
    console.error("Eroare la generarea site-ului:", error.message);

    res.status(500).json({
      message: "A apărut o eroare la generarea site-ului.",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Serverul ruleaza la http://localhost:${PORT}`);
  console.log("Server restarted!");
});
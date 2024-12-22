const fs = require("fs");
const path = require("path");

// Configuration
const inputDir = path.join(__dirname); // Current directory
const outputFile = path.join(__dirname, "combined.js"); // Output file path

// Function to recursively get all JS files excluding node_modules
function getAllJSFiles(dir, arrayOfFiles) {
  const files = fs.readdirSync(dir);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function (file) {
    const fullPath = path.join(dir, file);
    const relativePath = path.relative(__dirname, fullPath);

    // Skip node_modules directory
    if (relativePath.split(path.sep).includes("node_modules")) {
      return;
    }

    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllJSFiles(fullPath, arrayOfFiles);
    } else if (path.extname(fullPath).toLowerCase() === ".js") {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

// Function to concatenate JS files
function concatenateJSFiles(inputDirectory, outputFilePath) {
  let jsFiles;
  try {
    jsFiles = getAllJSFiles(inputDirectory);
  } catch (err) {
    console.error(`Error reading directory ${inputDirectory}:`, err);
    return;
  }

  if (jsFiles.length === 0) {
    console.log("No JavaScript files found to concatenate.");
    return;
  }

  // Sort files to ensure a consistent order (optional)
  jsFiles.sort();

  const readPromises = jsFiles.map((filePath) => {
    return fs.promises
      .readFile(filePath, "utf8")
      .then(
        (data) =>
          `// File: ${path.relative(inputDirectory, filePath)}\n${data}\n`
      )
      .catch((error) => {
        console.error(`Error reading file ${filePath}:`, error);
        return "";
      });
  });

  Promise.all(readPromises)
    .then((contents) => {
      const combinedContent = contents.join("\n");

      fs.writeFile(outputFilePath, combinedContent, "utf8", (writeErr) => {
        if (writeErr) {
          console.error(`Error writing to file ${outputFilePath}:`, writeErr);
          return;
        }
        console.log(
          `Successfully concatenated ${jsFiles.length} files into ${outputFilePath}`
        );
      });
    })
    .catch((error) => {
      console.error("Error during file concatenation:", error);
    });
}

// Execute the concatenation
concatenateJSFiles(inputDir, outputFile);

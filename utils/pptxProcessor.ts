import JSZip from 'jszip';
import Papa from 'papaparse';
import { CsvRow, ColumnMapping } from '../types';

export const parseCSV = (file: File): Promise<CsvRow[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(), // Trim whitespace from headers
      complete: (results) => {
        resolve(results.data as CsvRow[]);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

export const extractKeysFromPPTX = async (file: File): Promise<string[]> => {
  try {
    const zip = await JSZip.loadAsync(file);
    // Usually the main slide is slide1.xml. 
    // For a robust "Batch Generator", checking the first slide is usually sufficient for validation.
    const slideFile = zip.file("ppt/slides/slide1.xml");
    
    if (!slideFile) {
      throw new Error("Could not find slide1.xml in the PowerPoint file.");
    }

    const slideContent = await slideFile.async("string");
    
    // Regex to find patterns like {{NAME}}, {{Title}}, etc.
    const regex = /{{(.*?)}}/g;
    const matches = slideContent.match(regex);
    
    if (!matches) return [];
    
    // Return unique keys without braces and TRIMMED
    // Explicitly cast to string[] to resolve type inference issues with Array.from
    const uniqueKeys = Array.from(new Set(matches.map(m => m.replace(/{{|}}/g, '').trim()))) as string[];
    return uniqueKeys;

  } catch (error) {
    console.error("Error reading PPTX:", error);
    return [];
  }
};

export const generateBatch = async (
  templateFile: File, 
  data: CsvRow[], 
  mapping: ColumnMapping,
  onProgress: (current: number, total: number) => void
): Promise<Blob> => {
  
  const total = data.length;
  const masterZip = new JSZip(); // This will contain all the generated PPTX files
  const templateArrayBuffer = await templateFile.arrayBuffer();

  for (let i = 0; i < total; i++) {
    const row = data[i];
    
    // load the template fresh for every row to ensure clean state
    const pptxZip = await JSZip.loadAsync(templateArrayBuffer);
    
    // We need to iterate over ALL slides to do replacements
    const slideFiles = Object.keys(pptxZip.files).filter(path => 
      path.startsWith("ppt/slides/slide") && path.endsWith(".xml")
    );

    for (const slidePath of slideFiles) {
      const slideFile = pptxZip.file(slidePath);
      if (slideFile) {
        let content = await slideFile.async("string");
        
        // REPLACEMENT STRATEGY:
        // Use the provided mapping configuration.
        
        const regex = /{{(.*?)}}/g;
        content = content.replace(regex, (match, capturedKey) => {
          // match is "{{ KEY }}"
          // capturedKey is " KEY "
          const cleanKey = capturedKey.trim(); // "KEY"
          
          // Look up the mapped CSV column name for this template key
          const csvColumnName = mapping[cleanKey];
          
          if (csvColumnName && row[csvColumnName] !== undefined) {
             const value = row[csvColumnName] || "";
             
             // XML escaping for the value to prevent breaking the PPTX structure
             return value
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
          }
          
          // If unmapped, leave the placeholder
          return match;
        });

        pptxZip.file(slidePath, content);
      }
    }

    // Generate the individual PPTX blob
    const pptxBlob = await pptxZip.generateAsync({ type: "blob" });
    
    // Name the file based on the first column or Row index
    const fileName = `slide_${i + 1}_${Object.values(row)[0]?.replace(/[^a-z0-9]/gi, '_') || 'generated'}.pptx`;
    
    // Add to master zip
    masterZip.file(fileName, pptxBlob);
    
    onProgress(i + 1, total);
  }

  // Generate the final ZIP containing all PPTXs
  return await masterZip.generateAsync({ type: "blob" });
};
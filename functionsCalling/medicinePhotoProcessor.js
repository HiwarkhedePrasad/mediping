// medicinePhotoProcessor.js - Process medicine photos using Gemini Vision API
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Medicine database - In a real application, this would be a proper database
const medicineDatabase = {
  "aspirin": {
    medicineName: "Aspirin",
    description: "A common pain reliever and anti-inflammatory medication used to treat pain, fever, and inflammation.",
    dosage: "325-650mg every 4-6 hours as needed, not to exceed 4g per day",
    sideEffects: "May cause stomach upset, bleeding, or allergic reactions in some people",
    precautions: "Avoid if you have bleeding disorders, stomach ulcers, or are allergic to aspirin",
    buyLink: "https://www.amazon.com/s?k=aspirin"
  },
  "paracetamol": {
    medicineName: "Paracetamol (Acetaminophen)",
    description: "A pain reliever and fever reducer commonly used for headaches, muscle aches, and fever.",
    dosage: "500-1000mg every 4-6 hours as needed, not to exceed 4g per day",
    sideEffects: "Generally well-tolerated, but can cause liver damage in high doses",
    precautions: "Avoid alcohol and do not exceed recommended dosage",
    buyLink: "https://www.amazon.com/s?k=paracetamol"
  },
  "ibuprofen": {
    medicineName: "Ibuprofen",
    description: "A non-steroidal anti-inflammatory drug (NSAID) used to reduce pain, fever, and inflammation.",
    dosage: "200-400mg every 4-6 hours as needed, not to exceed 1.2g per day",
    sideEffects: "May cause stomach irritation, dizziness, or increased blood pressure",
    precautions: "Take with food, avoid if you have stomach ulcers or kidney problems",
    buyLink: "https://www.amazon.com/s?k=ibuprofen"
  },
  "vitamin c": {
    medicineName: "Vitamin C",
    description: "An essential vitamin that supports immune function, skin health, and iron absorption.",
    dosage: "500-1000mg daily, or as directed by your doctor",
    sideEffects: "Generally safe, but high doses may cause diarrhea or stomach upset",
    precautions: "Take with food to improve absorption",
    buyLink: "https://www.amazon.com/s?k=vitamin+c+supplement"
  },
  "calcium": {
    medicineName: "Calcium",
    description: "A mineral essential for strong bones, teeth, and muscle function.",
    dosage: "500-1000mg daily, or as directed by your doctor",
    sideEffects: "May cause constipation or stomach upset in some people",
    precautions: "Take with vitamin D for better absorption, avoid taking with iron supplements",
    buyLink: "https://www.amazon.com/s?k=calcium+supplement"
  }
};

// Process medicine photo using Gemini Vision API
export async function processMedicinePhotoWithGemini(mediaUrl) {
  try {
    console.log(`🔍 Starting medicine photo processing for: ${mediaUrl}`);
    
    // Download the image from Twilio's media URL
    const imageBuffer = await downloadImage(mediaUrl);
    
    // Convert image to base64 for Gemini Vision API
    const base64Image = imageBuffer.toString('base64');
    
    // Create the prompt for medicine identification
    const prompt = `Please analyze this image and identify if it shows any medicine, pill, tablet, or medication. 
    
    If you can identify a medicine, please provide:
    1. The name of the medicine (generic or brand name)
    2. What type of medication it appears to be
    3. Any visible markings, colors, or shapes that help identify it
    
    If this is not a medicine, please respond with "NOT_MEDICINE".
    
    Please be specific and accurate in your identification.`;
    
    // Call Gemini Vision API
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image
        }
      }
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    console.log(`🤖 Gemini Vision response: ${text}`);
    
    // Parse the response and extract medicine information
    const medicineInfo = parseMedicineResponse(text);
    
    if (medicineInfo) {
      return medicineInfo;
    } else {
      // If no specific medicine found, provide general information
      return {
        medicineName: "Medicine",
        description: "I can see this appears to be a medication, but I couldn't identify the specific type. Please consult your doctor or pharmacist for accurate information.",
        dosage: "Consult your doctor for proper dosage",
        sideEffects: "Consult your doctor for potential side effects",
        precautions: "Always read the label and consult your doctor before taking any medication",
        buyLink: "https://www.amazon.com/s?k=medicine"
      };
    }
    
  } catch (error) {
    console.error("❌ Error processing medicine photo with Gemini:", error);
    
    // Return a helpful error response
    return {
      medicineName: "Unknown Medicine",
      description: "I'm having trouble analyzing this image. Please try sending a clearer photo or describe the medicine in text.",
      dosage: "Consult your doctor for proper dosage",
      sideEffects: "Consult your doctor for potential side effects",
      precautions: "Always consult your doctor before taking any medication",
      buyLink: "https://www.amazon.com/s?k=medicine"
    };
  }
}

// Download image from URL
async function downloadImage(url) {
  try {
    console.log(`📥 Downloading image from: ${url}`);
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log(`✅ Image downloaded successfully (${response.data.length} bytes)`);
    return Buffer.from(response.data);
    
  } catch (error) {
    console.error("❌ Error downloading image:", error);
    throw new Error(`Failed to download image: ${error.message}`);
  }
}

// Parse Gemini's response to extract medicine information
function parseMedicineResponse(response) {
  try {
    const lowerResponse = response.toLowerCase();
    
    // Check if it's not a medicine
    if (lowerResponse.includes('not_medicine') || lowerResponse.includes('not a medicine')) {
      return null;
    }
    
    // Try to identify common medicines from the response
    for (const [key, medicine] of Object.entries(medicineDatabase)) {
      if (lowerResponse.includes(key) || lowerResponse.includes(medicine.name.toLowerCase())) {
        console.log(`🎯 Identified medicine: ${medicine.name}`);
        return medicine;
      }
    }
    
    // If no exact match, try to extract medicine name from the response
    const medicineNameMatch = response.match(/(?:medicine|pill|tablet|medication)[:\s]+([A-Za-z\s]+)/i);
    if (medicineNameMatch) {
      const extractedName = medicineNameMatch[1].trim();
      console.log(`🔍 Extracted medicine name: ${extractedName}`);
      
      return {
        medicineName: extractedName,
        description: "I can see this appears to be a medication. Please consult your doctor or pharmacist for accurate information.",
        dosage: "Consult your doctor for proper dosage",
        sideEffects: "Consult your doctor for potential side effects",
        precautions: "Always read the label and consult your doctor before taking any medication",
        buyLink: `https://www.amazon.com/s?k=${encodeURIComponent(extractedName)}`
      };
    }
    
    return null;
    
  } catch (error) {
    console.error("❌ Error parsing medicine response:", error);
    return null;
  }
}

// Get medicine information by name (fallback function)
export function getMedicineInfoByName(medicineName) {
  const lowerName = medicineName.toLowerCase();
  
  for (const [key, medicine] of Object.entries(medicineDatabase)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return medicine;
    }
  }
  
  // Return generic information if no match found
  return {
    medicineName: medicineName,
    description: "Please consult your doctor or pharmacist for accurate information about this medication.",
    dosage: "Consult your doctor for proper dosage",
    sideEffects: "Consult your doctor for potential side effects",
    precautions: "Always read the label and consult your doctor before taking any medication",
    buyLink: `https://www.amazon.com/s?k=${encodeURIComponent(medicineName)}`
  };
}

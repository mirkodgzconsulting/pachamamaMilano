import sharp from 'sharp';
import path from 'path';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from './cloudflare';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export async function generateGiftCardImage(cardData: any) {
  try {
    // 1. Ruta de la plantilla (Usamos el Modelo 3 como base oficial)
    const templatePath = path.resolve('./src/imagesgc/model3.webp');
    
    // 2. Crear los SVGs para el texto
    const amountText = Buffer.from(`
      <svg width="600" height="200">
        <style>
          .amount { fill: #ffd54e; font-size: 130px; font-family: 'Bebas Neue', sans-serif; font-weight: bold; }
        </style>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="amount">€${cardData.amount / 100}</text>
      </svg>
    `);

    // Lógica para envolver el texto de la dedicatoria
    const message = cardData.message || 'Esperienza Pachamama Milano';
    const maxChars = 52; // Más caracteres por línea al reducir un poco el font
    const words = message.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word: string) => {
      if ((currentLine + word).length > maxChars) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    });
    lines.push(currentLine.trim());

    // Ajuste dinámico de tamaño de fuente según cantidad de líneas
    const lineCount = lines.length;
    const fontSize = lineCount > 6 ? 15 : lineCount > 4 ? 17 : 19;
    const lineHeight = fontSize + 6;

    const detailsText = Buffer.from(`
      <svg width="800" height="600">
        <style>
          .title { fill: #1a1a1a; font-size: 38px; font-family: 'Bebas Neue', sans-serif; letter-spacing: 2px; }
          .label { fill: #1a1a1a; font-size: 16px; font-family: 'Montserrat', sans-serif; text-transform: uppercase; letter-spacing: 2px; opacity: 0.5; font-weight: bold; }
          .value { fill: #1a1a1a; font-size: 32px; font-family: 'Bebas Neue', sans-serif; letter-spacing: 1px; }
          .message { fill: #1a1a1a; font-size: ${fontSize}px; font-family: 'Montserrat', sans-serif; font-style: italic; font-weight: 500; }
        </style>
        
        <text x="50" y="40" class="title">GIFT CARD PACHAMAMA MILANO</text>

        <!-- Etiqueta de valor a la derecha -->
        <text x="550" y="85" class="label">VALORE:</text>
        <text x="550" y="118" class="value">€${cardData.amount / 100}</text>

        <text x="50" y="85" class="label">DA:</text>
        <text x="50" y="118" class="value">${cardData.sender_name.toUpperCase()}</text>
        
        <text x="50" y="155" class="label">PER:</text>
        <text x="50" y="188" class="value">${cardData.receiver_name.toUpperCase()}</text>
        
        <line x1="50" y1="215" x2="700" y2="215" stroke="#1a1a1a" stroke-width="1" opacity="0.1" />

        <text x="50" y="245" class="label" style="font-size: 14px;">DEDICA:</text>
        ${lines.slice(0, 8).map((line, i) => 
          `<text x="50" y="${275 + (i * lineHeight)}" class="message">${line}</text>`
        ).join('')}
        
        <text x="50" y="550" class="label" style="font-size: 14px; opacity: 0.4;">ORDINE ID: ${cardData.id.split('-')[0].toUpperCase()}</text>
      </svg>
    `);

    // 3. Procesar con Sharp
    const generatedImage = await sharp(templatePath)
      .composite([
        { input: detailsText, top: 120, left: 630 } 
      ])
      .jpeg({ quality: 95 })
      .toBuffer();

    // 4. Subir a R2
    const fileName = `generated/giftcard-${cardData.id}.jpg`;
    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
      Body: generatedImage,
      ContentType: 'image/jpeg',
    });

    await r2Client.send(uploadCommand);

    // 5. Devolver URL y el Buffer para adjuntar
    const giftCardUrl = `${R2_PUBLIC_URL}/${fileName}`;
    return { giftCardUrl, imageBuffer: generatedImage };

  } catch (error) {
    console.error('Error generating gift card:', error);
    throw error;
  }
}

import sharp from 'sharp';
import path from 'path';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from './cloudflare';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export async function generateGiftCardImage(cardData: any) {
  try {
    // 1. Ruta de la plantilla
    const templatePath = path.resolve('./public/GIFTCARD.jpg');
    
    // 2. Crear los SVGs para el texto (Sharp maneja mejor el texto vía SVG)
    const amountText = Buffer.from(`
      <svg width="800" height="200">
        <style>
          .amount { fill: #ffd54e; font-size: 150px; font-family: 'Bebas Neue', sans-serif; font-weight: bold; text-transform: uppercase; }
        </style>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="amount">€${cardData.amount / 100}</text>
      </svg>
    `);

    const detailsText = Buffer.from(`
      <svg width="1000" height="400">
        <style>
          .label { fill: #ffffff; font-size: 24px; font-family: 'Montserrat', sans-serif; text-transform: uppercase; letter-spacing: 2px; }
          .value { fill: #ffd54e; font-size: 36px; font-family: 'Bebas Neue', sans-serif; letter-spacing: 1px; }
          .message { fill: #ffffff; font-size: 22px; font-family: 'Montserrat', sans-serif; font-style: italic; }
        </style>
        <text x="50" y="50" class="label">PER:</text>
        <text x="120" y="52" class="value">${cardData.receiver_name.toUpperCase()}</text>
        
        <text x="50" y="100" class="label">DA PARTE DI:</text>
        <text x="230" y="102" class="value">${cardData.sender_name.toUpperCase()}</text>
        
        <text x="50" y="180" class="label">MESSAGGIO:</text>
        <text x="50" y="220" class="message">${cardData.message || 'Esperienza Pachamama Milano'}</text>
        
        <text x="50" y="350" class="label" font-size="18px">ID ORDINE: ${cardData.id.split('-')[0].toUpperCase()}</text>
      </svg>
    `);

    // 3. Procesar con Sharp
    // Nota: Las coordenadas [top, left] dependen de la imagen GIFTCARD.jpg original
    const generatedImage = await sharp(templatePath)
      .composite([
        { input: amountText, top: 250, left: 100 }, // El importe grande
        { input: detailsText, top: 500, left: 100 } // Los detalles abajo
      ])
      .jpeg({ quality: 90 })
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

    // 5. Devolver URL
    return `${R2_PUBLIC_URL}/${fileName}`;

  } catch (error) {
    console.error('Error generating gift card:', error);
    throw error;
  }
}

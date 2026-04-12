import JSZip from 'jszip';

export interface ParsedSlide {
  id: string;
  name: string;
  imageUrl?: string;
  texts: string[];
}

/**
 * Parse a PPTX file and extract slide images + text content.
 * PPTX is a ZIP archive with:
 *   ppt/slides/slide1.xml, slide2.xml ...
 *   ppt/media/image1.png, image2.jpg ...
 *   ppt/slides/_rels/slide1.xml.rels (maps slides to media)
 */
export async function parsePptx(file: File): Promise<ParsedSlide[]> {
  const zip = await JSZip.loadAsync(file);
  const slides: ParsedSlide[] = [];

  // 1. Find all slide XML files and sort them
  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/i.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/i)?.[1] || '0');
      const numB = parseInt(b.match(/slide(\d+)/i)?.[1] || '0');
      return numA - numB;
    });

  for (let i = 0; i < slideFiles.length; i++) {
    const slideFileName = slideFiles[i];
    const slideNum = parseInt(slideFileName.match(/slide(\d+)/i)?.[1] || `${i + 1}`);
    const slideXml = await zip.file(slideFileName)?.async('text');

    // Extract text content from XML
    const texts: string[] = [];
    if (slideXml) {
      // Match <a:t>text</a:t> tags (PowerPoint text runs)
      const textMatches = slideXml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g);
      for (const match of textMatches) {
        const text = match[1].trim();
        if (text) texts.push(text);
      }
    }

    // 2. Try to find the slide's relationship file to get linked images
    const relPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
    const relFile = zip.file(relPath);
    let imageUrl: string | undefined;

    if (relFile) {
      const relXml = await relFile.async('text');
      // Find image relationships
      const imageRels = [...relXml.matchAll(/Target="([^"]*?\.(?:png|jpg|jpeg|gif|bmp|svg|emf|wmf))"/gi)];

      if (imageRels.length > 0) {
        // Get the first/largest image as slide thumbnail
        for (const rel of imageRels) {
          let targetPath = rel[1];
          // Resolve relative path
          if (targetPath.startsWith('../')) {
            targetPath = 'ppt/' + targetPath.replace('../', '');
          } else if (!targetPath.startsWith('ppt/')) {
            targetPath = 'ppt/slides/' + targetPath;
          }

          const imageFile = zip.file(targetPath);
          if (imageFile) {
            const blob = await imageFile.async('blob');
            const ext = targetPath.split('.').pop()?.toLowerCase() || 'png';
            const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
            imageUrl = URL.createObjectURL(new Blob([blob], { type: mimeType }));
            break;
          }
        }
      }
    }

    slides.push({
      id: `pptx-slide-${Date.now()}-${slideNum}`,
      name: `Slide ${slideNum}`,
      imageUrl,
      texts,
    });
  }

  return slides;
}

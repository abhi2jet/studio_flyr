export interface WatermarkOptions {
  text: string;
  placement: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: number;
  size: number;
  disabled: boolean;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  fontFamily: string;
}

export const applyWatermark = async (base64Image: string): Promise<string> => {
  // Read from window object if available
  const options: WatermarkOptions = (window as any).__watermarkOptions || {
    text: 'PALLAVI JEWELLERS',
    placement: 'center',
    opacity: 30,
    size: 8,
    disabled: false,
    fontWeight: 'bold',
    fontStyle: 'normal',
    fontFamily: 'Arial'
  };

  if (options.disabled) {
    return base64Image;
  }
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      
      const fontSize = Math.min(canvas.width, canvas.height) * (options.size / 100);
      ctx.font = `${options.fontStyle} ${options.fontWeight} ${fontSize}px ${options.fontFamily}, sans-serif`;
      ctx.fillStyle = `rgba(212, 175, 55, ${options.opacity / 100})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let x = canvas.width / 2;
      let y = canvas.height / 2;
      
      if (options.placement === 'top-left') { x = fontSize; y = fontSize; }
      else if (options.placement === 'top-right') { x = canvas.width - fontSize; y = fontSize; }
      else if (options.placement === 'bottom-left') { x = fontSize; y = canvas.height - fontSize; }
      else if (options.placement === 'bottom-right') { x = canvas.width - fontSize; y = canvas.height - fontSize; }

      ctx.save();
      ctx.translate(x, y);
      if (options.placement === 'center') {
        ctx.rotate(-Math.PI / 4);
      }
      ctx.fillText(options.text, 0, 0);
      ctx.restore();
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = base64Image;
  });
};

document.addEventListener('DOMContentLoaded', function () {
  const swiper = document.querySelector('#mySwiper');
  const downloadBtn = document.getElementById('downloadBtn');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  const toast = document.getElementById('toast');
  const translationsElement = document.getElementById('translations');

  // Récupère les traductions depuis l'élément caché
  const translations = {
    gallery: {
      buttons: {
        download: downloadBtn.querySelector('.progress-text').textContent,
        downloadAll: downloadAllBtn.querySelector('.progress-text').textContent,
        downloading: translationsElement.dataset.downloading,
        preparing: translationsElement.dataset.preparing,
        preparingCount: translationsElement.dataset.preparingCount,
        creatingZip: translationsElement.dataset.creatingZip,
        downloadComplete: translationsElement.dataset.downloadComplete
      },
      toast: {
        photoDownloaded: translationsElement.dataset.photoDownloaded,
        photosDownloaded: translationsElement.dataset.photosDownloaded,
        downloadError: translationsElement.dataset.downloadError,
        downloadAllError: translationsElement.dataset.downloadAllError
      }
    }
  };

  function showToast(message, duration = 3000) {
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => {
      toast.classList.remove('visible');
    }, duration);
  }

  function updateButtonProgress(button, progress, text) {
    const progressBar = button.querySelector('.progress-bar');
    const progressText = button.querySelector('.progress-text');

    progressBar.style.width = `${progress}%`;
    if (text) progressText.textContent = text;

    if (progress > 0) {
      button.classList.add('downloading');
    } else {
      button.classList.remove('downloading');
    }
  }

  async function fetchImageAsBlob(imageUrl) {
    const response = await fetch(imageUrl);
    return await response.blob();
  }

  downloadBtn.addEventListener('click', async function () {
    try {
      const activeSlide = swiper.swiper.slides[swiper.swiper.activeIndex];
      const imageUrl = activeSlide.getAttribute('data-path');
      if (!imageUrl) return;

      updateButtonProgress(downloadBtn, 50, translations.gallery.buttons.downloading);
      downloadBtn.disabled = true;

      const blob = await fetchImageAsBlob(imageUrl);
      const fileName = imageUrl.split('/').pop().split('?')[0] || 'image.jpg';

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      showToast(translations.gallery.toast.photoDownloaded);
    } catch (error) {
      console.error('Error:', error);
      showToast(translations.gallery.toast.downloadError);
    } finally {
      await new Promise(resolve => setTimeout(resolve, 500));
      updateButtonProgress(downloadBtn, 0, translations.gallery.buttons.download);
      downloadBtn.disabled = false;
    }
  });

  downloadAllBtn.addEventListener('click', async function () {
    try {
      const slides = Array.from(swiper.querySelectorAll('swiper-slide'));
      const totalImages = slides.length;

      downloadAllBtn.disabled = true;
      downloadBtn.disabled = true;

      updateButtonProgress(downloadAllBtn, 0, translations.gallery.buttons.preparing);

      const zip = new JSZip();
      let completedImages = 0;

      const imagePromises = slides.map(async (slide, index) => {
        const imageUrl = slide.getAttribute('data-path');
        const fileName = `photo_${index + 1}.jpg`;

        try {
          const blob = await fetchImageAsBlob(imageUrl);
          zip.file(fileName, blob);

          completedImages++;
          const progress = (completedImages / totalImages) * 80;
          const preparingText = translations.gallery.buttons.preparingCount
            .replace('{count}', completedImages)
            .replace('{total}', totalImages);
          
          updateButtonProgress(downloadAllBtn, progress, preparingText);
        } catch (error) {
          console.error(`Error for image ${fileName}:`, error);
        }
      });

      await Promise.all(imagePromises);

      updateButtonProgress(downloadAllBtn, 90, translations.gallery.buttons.creatingZip);
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE'
      });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = 'photos.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      updateButtonProgress(downloadAllBtn, 100, translations.gallery.buttons.downloadComplete);
      showToast(translations.gallery.toast.photosDownloaded);
    } catch (error) {
      showToast(translations.gallery.toast.downloadAllError);
    } finally {
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateButtonProgress(downloadAllBtn, 0, translations.gallery.buttons.downloadAll);
      downloadAllBtn.disabled = false;
      downloadBtn.disabled = false;
    }
  });
});
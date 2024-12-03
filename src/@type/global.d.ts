/**
 * Represents the overall language configuration.
 */
export interface LanguageConfig {
  /** The currently active language. */
  currentLanguage: string;
}

/**
 * Root interface for the translation configuration.
 */
export interface Translation {
  /** Metadata for the application. */
  meta: GalleryMeta;

  /** Content and text labels related to the photo gallery. */
  gallery: GalleryContent;

  /** Content for the not-found page. */
  notFound: NotFoundContent;

  /** Additional sections or configurations can be added here in the future. */
}

/**
 * Represents metadata for the photo gallery page.
 */
interface GalleryMeta {
  /** The title of the page. */
  title: string;

  /** A short description of the photo gallery for SEO purposes. */
  description: string;

  /** Keywords related to the photo gallery, used for SEO. */
  keywords: string;

  /** The description used for Open Graph meta tags (e.g., for social sharing). */
  ogDescription: string;
}

/**
 * Represents the text content for action buttons in the gallery.
 */
interface GalleryButtons {
  /** Text for the button to download a single photo. */
  download: string;

  /** Text for the button to download all photos. */
  downloadAll: string;

  /** Text indicating that a photo is being downloaded. */
  downloading: string;

  /** Text indicating preparation for downloading photos. */
  preparing: string;

  /** Text showing the preparation progress. */
  preparingCount: string;

  /** Text indicating the creation of a ZIP file. */
  creatingZip: string;

  /** Text displayed when a download is complete. */
  downloadComplete: string;
}

/**
 * Represents toast notifications related to the gallery.
 */
interface GalleryToast {
  /** Toast message for a successfully downloaded photo. */
  photoDownloaded: string;

  /** Toast message for successfully downloaded photos. */
  photosDownloaded: string;

  /** Toast message for a download error. */
  downloadError: string;

  /** Toast message for an error during bulk download. */
  downloadAllError: string;
}

/**
 * Represents content related to the photo gallery.
 */
interface GalleryContent {
  /** The title displayed for the gallery section. */
  title: string;

  /** Label for a single photo count. */
  photoCount: string;

  /** Label for multiple photo counts in the gallery. */
  photosCount: string;

  /** Error message displayed when photos fail to load. */
  error: string;

  /** Text content for the buttons in the gallery. */
  buttons: GalleryButtons;

  /** Toast notifications for the gallery. */
  toast: GalleryToast;
}

/**
 * Represents the content for the "not found" page.
 */
interface NotFoundContent {
  /** The title displayed on the "not found" page. */
  title: string;

  /** The main message on the "not found" page. */
  message: string;

  /** The label for the link to go back to the home page. */
  backLink: string;

  /** Footer content for the "not found" page. */
  footer: NotFoundFooter;
}

/**
 * Represents the footer content for the "not found" page.
 */
interface NotFoundFooter {
  /** Copyright text displayed in the footer. */
  copyright: string;
}

exports.config = {
  bucket: 'email.nicholasgriffin.dev',
  keyPrefix: 'email/',
  allowedEmailFrom: ['Nicholas Griffin <me@nicholasgriffin.co.uk>'],
  defaultCategory: {
    category: 'unknown',
    bucket: 'email.nicholasgriffin.dev',
    keyPrefix: 'processed/unknown',
  },
  emailToCategories: [
    {
      email: 'bookmarks@nicholasgriffin.dev',
      category: 'bookmarks',
      bucket: 'email.nicholasgriffin.dev',
      keyPrefix: 'processed/bookmarks',
    },
  ],
};

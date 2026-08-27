export function grokPwaPlugin() {
  return {
    name: "my-tracker:pwa",
    transformIndexHtml(html) {
      return html.replace(
        "</head>",
        `  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/svg+xml" href="/icon.svg">
  <link rel="apple-touch-icon" href="/icon.svg">
  <meta name="apple-mobile-web-app-title" content="My Tracker">
  <meta name="application-name" content="My Tracker">
  <meta name="theme-color" content="#09090b">
</head>`
      );
    },
  };
}

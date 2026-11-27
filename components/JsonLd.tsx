// Renders a schema.org JSON-LD block. Display/discovery only — the data is
// built from fields the page already loaded.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

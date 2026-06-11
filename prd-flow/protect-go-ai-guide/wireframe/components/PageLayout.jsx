export default function PageLayout({ title, breadcrumb, actions, children }) {
  return (
    <main
      style={{
        padding: "var(--spacing-32)",
        maxWidth: 1200,
        paddingBottom: "var(--spacing-128)",
      }}
    >
      {/* 브레드크럼 */}
      {breadcrumb && (
        <div
          style={{
            display: "flex",
            gap: "var(--spacing-4)",
            alignItems: "center",
            font: "var(--text-label-2-regular)",
            color: "var(--semantic-text-sub)",
            marginBottom: "var(--spacing-16)",
          }}
        >
          {breadcrumb.map((item, i) => (
            <span
              key={i}
              style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)" }}
            >
              {i > 0 && <span style={{ color: "var(--semantic-natural-strong)" }}>/</span>}
              <span
                style={
                  item.current
                    ? { color: "var(--semantic-text-default)" }
                    : { cursor: item.onClick ? "pointer" : "default" }
                }
                onClick={item.onClick}
              >
                {item.label}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* 페이지 타이틀 + 액션 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--spacing-24)",
        }}
      >
        <h1
          style={{
            font: "var(--text-title-1-semibold)",
            color: "var(--semantic-text-default)",
            margin: 0,
          }}
        >
          {title}
        </h1>
        {actions && (
          <div style={{ display: "flex", gap: "var(--spacing-8)" }}>{actions}</div>
        )}
      </div>

      {children}
    </main>
  );
}

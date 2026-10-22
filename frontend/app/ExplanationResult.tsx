export type TemplateExplanation = {
  explanation_version: string;
  summary: string;
  sections: { title: string; text: string }[];
  warnings: string[];
};

export default function ExplanationResult({ result, keyText, noteText }: {
  result: TemplateExplanation;
  keyText: string;
  noteText: string;
}) {
  return <div className="explanation-result">
    <h4>全曲简短解释</h4>
    <p>{keyText}</p>
    <p>{noteText}</p>
    <details className="secondary-details explanation-details">
      <summary>完整模板解释、限制与诊断</summary>
      <p className="panel-note">解释版本：{result.explanation_version}</p>
      <p className="summary-text">{result.summary}</p>
      <div className="section-list">
        {result.sections.map((section, index) => <section key={`${index}-${section.title}`} className="explanation-section">
          <h3>{section.title}</h3>
          <p>{section.text}</p>
        </section>)}
      </div>
      <h3>完整警告</h3>
      <ul className="warning-list">{result.warnings.map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}</ul>
    </details>
  </div>;
}

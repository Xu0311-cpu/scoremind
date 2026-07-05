"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type KeyAnalysis = {
  tonic: string | null;
  mode: string | null;
  confidence: number | null;
};

type DetectedChord = {
  measure_number: number;
  beat: number | null;
  pitches: string[];
  root: string | null;
  quality: string;
  roman_numeral: string | null;
  harmonic_function: string;
  evidence: {
    interval_pattern: number[];
  };
};

type NonChordToneCandidate = {
  kind: "passing_tone_candidate" | "neighbor_tone_candidate" | "unknown_non_chord_tone_candidate" | "not_applicable";
  confidence: "low" | "medium";
  reason: string;
  limitations: string[];
};

type AnalyzedNote = {
  measure_number: number;
  beat: number | null;
  offset: number;
  duration: number | null;
  pitch: string;
  pitch_class: string;
  role: "chord_tone" | "non_chord_tone" | "unknown";
  related_chord: {
    root: string | null;
    quality: string;
    roman_numeral: string | null;
  } | null;
  possible_non_chord_tone_type: string | null;
  non_chord_tone_candidate?: NonChordToneCandidate | null;
  evidence: {
    chord_pitch_classes: string[];
    note_pitch_class: string;
    reason: string;
    analysis_scope: string[];
    context_source: "same_offset" | "carried_previous_chord" | "none";
  };
};

type MeasureHarmonicContext = {
  selected_chord_label: string | null;
  selected_root: string | null;
  selected_quality: string;
  selected_roman_numeral: string | null;
  selected_harmonic_function: string;
  context_source: string;
  confidence: "supported" | "partial" | "low";
  warnings: string[];
};

type MeasureAnalysis = {
  measure_number: number;
  detected_chords: DetectedChord[];
  analyzed_notes: AnalyzedNote[];
  harmonic_context?: MeasureHarmonicContext | null;
};

type MusicXMLAnalysisResponse = {
  file_name: string;
  analysis_version: string;
  key_analysis: KeyAnalysis;
  warnings: string[];
  measures: MeasureAnalysis[];
};

type ExplanationSection = {
  title: string;
  text: string;
};

type ExplanationResponse = {
  explanation_version: string;
  summary: string;
  sections: ExplanationSection[];
  warnings: string[];
};

type Reliability = {
  label: "Supported" | "Needs review" | "Unsupported";
  className: "supported" | "needs-review" | "unsupported";
};

type NoteRoleFilter = "all" | AnalyzedNote["role"];

type NoteContextFilter = "all" | AnalyzedNote["evidence"]["context_source"];

type NoteSummary = {
  total: number;
  chordTone: number;
  nonChordTone: number;
  unknown: number;
  sameOffset: number;
  carriedContext: number;
  noContext: number;
  passingCandidate: number;
  neighborCandidate: number;
  unknownNctCandidate: number;
};

type AnalysisView = "student" | "technical";

type InputSourceId =
  | "musicxml"
  | "notation"
  | "pdf"
  | "image"
  | "scan"
  | "midi_audio";

type InputSourceOption = {
  id: InputSourceId;
  label: string;
  status: string;
  statusClass: "supported" | "export" | "research" | "future" | "outside";
  message: string;
};

type StudentSummary = {
  keySummary: string;
  chordLines: string[];
  noteSummary: string;
  contextExplanation: string[];
  processSteps: ProcessStep[];
  measureWalkthroughs: MeasureWalkthrough[];
  limitations: string[];
  warnings: string[];
};

type ProcessStep = {
  title: string;
  lines: string[];
};

type MeasureWalkthrough = {
  measureNumber: number;
  chordSummaries: string[];
  noteSummary: NoteSummary;
  noteRelationshipSentence: string;
  readingGuide: string;
  harmonicContextSummary: string;
  cautions: string[];
};

type TerminologyItem = {
  term: string;
  explanation: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

const SUPPORTED_EXTENSIONS = [".musicxml", ".xml"];

const INPUT_SOURCE_OPTIONS: InputSourceOption[] = [
  {
    id: "musicxml",
    label: "MusicXML / XML",
    status: "Supported now",
    statusClass: "supported",
    message: "Upload `.musicxml` or `.xml` directly. This is the current reliable input path.",
  },
  {
    id: "notation",
    label: "MuseScore / notation software",
    status: "Export first",
    statusClass: "export",
    message: "Export your score as MusicXML/XML from MuseScore or notation software, then upload it here.",
  },
  {
    id: "pdf",
    label: "PDF score",
    status: "Research only",
    statusClass: "research",
    message: "PDF input requires OMR. OMR is still research-only because recognition errors can corrupt downstream analysis.",
  },
  {
    id: "image",
    label: "Image / screenshot",
    status: "Research only",
    statusClass: "research",
    message: "Image input also requires OMR and correction workflow. Current runtime does not process image files.",
  },
  {
    id: "scan",
    label: "Scanned paper score",
    status: "Future work",
    statusClass: "future",
    message: "Scanned paper scores need OMR plus correction before analysis. This is not supported in the current runtime.",
  },
  {
    id: "midi_audio",
    label: "MIDI / audio",
    status: "Outside current scope",
    statusClass: "outside",
    message: "ScoreMind currently analyzes symbolic notation data, not performance or audio input.",
  },
];

const LEARNING_HINTS = [
  "阅读顺序建议：先看全局调性，再看每小节的和弦级数和功能，最后看音符是否属于当前和声。",
  "非和弦音候选提示（如可能的经过音、可能的辅助音）只是基于简单相邻音高的学习提示，不是最终乐理结论。",
  "沿用前和弦（carried context）比同拍点和声（same offset）的可信度更弱，只能作为保守参考。",
];

const TERMINOLOGY_GUIDE: TerminologyItem[] = [
  {
    term: "Global key / 全局调性",
    explanation: "系统对整段乐谱做出的单一调性判断，例如 C major。当前不分析局部转调。",
  },
  {
    term: "Roman numeral / 罗马数字",
    explanation: "把和弦放到调性中表示级数。例如 C major 里的 C 和弦是 I 级，G 和弦是 V 级。",
  },
  {
    term: "Harmonic function / 和声功能",
    explanation: "和弦在调性中的角色分类：tonic（稳定）、predominant（准备）、dominant（倾向解决）、unknown（无法判断）。",
  },
  {
    term: "tonic / 主功能",
    explanation: "听感上较稳定，像回到中心。例如 I 级和 vi 级。",
  },
  {
    term: "predominant / 下属功能",
    explanation: "通常为属功能做铺垫。例如 ii 级和 IV 级。",
  },
  {
    term: "dominant / 属功能",
    explanation: "带有走向主功能的倾向。例如 V 级和 vii 级。",
  },
  {
    term: "chord tone / 和弦音",
    explanation: "该音属于当前和弦。例如 C 和弦中的 C、E、G 都是和弦音。",
  },
  {
    term: "non-chord tone candidate / 非和弦音候选",
    explanation: "该音不属于当前和弦，但系统还没有做完整的古典非和弦音分类。",
  },
  {
    term: "same-offset harmony / 同拍点和声",
    explanation: "音符和和弦同时出现，是最直接的参考依据。",
  },
  {
    term: "carried previous chord / 沿用前和弦",
    explanation: "当前拍点没有新和弦时，系统沿用同小节内最近的和弦作为保守参考。",
  },
  {
    term: "unknown / 无上下文",
    explanation: "系统没有足够的和声信息来判断该音的归属。",
  },
];

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scoreContainerRef = useRef<HTMLDivElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [musicXmlText, setMusicXmlText] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MusicXMLAnalysisResponse | null>(null);
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [renderingScore, setRenderingScore] = useState(false);
  const [scoreRenderError, setScoreRenderError] = useState<string | null>(null);
  const [markdownReport, setMarkdownReport] = useState("");
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [noteRoleFilter, setNoteRoleFilter] = useState<NoteRoleFilter>("all");
  const [noteContextFilter, setNoteContextFilter] = useState<NoteContextFilter>("all");
  const [analysisView, setAnalysisView] = useState<AnalysisView>("student");
  const [inputSource, setInputSource] = useState<InputSourceId>("musicxml");
  const [error, setError] = useState<string | null>(null);

  const detectedChordCount = useMemo(() => {
    if (!analysis) {
      return 0;
    }
    return analysis.measures.reduce((count, measure) => count + measure.detected_chords.length, 0);
  }, [analysis]);

  const noteRoleCounts = useMemo(() => {
    if (!analysis) {
      return emptyNoteSummary();
    }
    return summarizeNotes(analysis.measures.flatMap((measure) => measure.analyzed_notes ?? []));
  }, [analysis]);

  const measuresWithChords = useMemo(() => {
    if (!analysis) {
      return [];
    }
    return analysis.measures.filter((measure) => measure.detected_chords.length > 0);
  }, [analysis]);

  const measuresWithAnalyzedNotes = useMemo(() => {
    if (!analysis) {
      return [];
    }
    return analysis.measures.filter((measure) => (measure.analyzed_notes ?? []).length > 0);
  }, [analysis]);

  const filteredMeasuresWithAnalyzedNotes = useMemo(() => {
    if (!analysis) {
      return [];
    }
    return analysis.measures
      .map((measure) => ({
        ...measure,
        analyzed_notes: (measure.analyzed_notes ?? []).filter((note) => {
          const roleMatches = noteRoleFilter === "all" || note.role === noteRoleFilter;
          const contextMatches =
            noteContextFilter === "all" || note.evidence.context_source === noteContextFilter;
          return roleMatches && contextMatches;
        }),
      }))
      .filter((measure) => measure.analyzed_notes.length > 0);
  }, [analysis, noteRoleFilter, noteContextFilter]);

  const studentSummary = useMemo(() => {
    if (!analysis) {
      return null;
    }
    return buildStudentSummary(analysis);
  }, [analysis]);

  const selectedInputSource = INPUT_SOURCE_OPTIONS.find((option) => option.id === inputSource) ?? INPUT_SOURCE_OPTIONS[0];

  useEffect(() => {
    if (!musicXmlText || !scoreContainerRef.current) {
      return;
    }

    let cancelled = false;
    const xmlToRender = musicXmlText;

    async function renderScore() {
      const container = scoreContainerRef.current;
      if (!container) {
        return;
      }

      setRenderingScore(true);
      setScoreRenderError(null);
      container.innerHTML = "";

      try {
        const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
        if (cancelled) {
          return;
        }

        const osmd = new OpenSheetMusicDisplay(container, {
          autoResize: true,
          drawTitle: true,
        });
        await osmd.load(xmlToRender);
        if (cancelled) {
          return;
        }
        await osmd.render();
      } catch {
        if (!cancelled) {
          container.innerHTML = "";
          setScoreRenderError("Score preview could not be rendered, but analysis may still work. / 乐谱预览渲染失败，但分析可能仍可进行。");
        }
      } finally {
        if (!cancelled) {
          setRenderingScore(false);
        }
      }
    }

    void renderScore();

    return () => {
      cancelled = true;
    };
  }, [musicXmlText]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    if (selectedFile && !isSupportedFile(selectedFile.name)) {
      resetState();
      setError("This file type is not supported. Please upload a .musicxml or .xml file. / 不支持此文件类型，请上传 .musicxml 或 .xml 文件。");
      return;
    }

    setFile(selectedFile);
    setMusicXmlText(null);
    setScoreRenderError(null);
    setAnalysis(null);
    setExplanation(null);
    setMarkdownReport("");
    setCopyMessage(null);
    setNoteRoleFilter("all");
    setNoteContextFilter("all");
    setAnalysisView("student");
    setError(null);

    if (selectedFile) {
      void loadMusicXmlText(selectedFile);
    }
  }

  async function loadMusicXmlText(selectedFile: File) {
    try {
      setMusicXmlText(await selectedFile.text());
    } catch {
      setScoreRenderError("Score preview could not be rendered, but analysis may still work. / 乐谱预览渲染失败，但分析可能仍可进行。");
    }
  }

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Please select a .musicxml or .xml file first. / 请先选择 .musicxml 或 .xml 文件。");
      return;
    }

    setLoadingAnalysis(true);
    setError(null);
    setAnalysis(null);
    setExplanation(null);
    setMarkdownReport("");
    setCopyMessage(null);
    setNoteRoleFilter("all");
    setNoteContextFilter("all");
    setAnalysisView("student");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_BASE_URL}/api/v1/analyze/musicxml`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Analysis failed. Please check the file and try again. / 分析失败，请检查文件后重试。"));
      }
      const payload = await response.json();
      setAnalysis(payload);
    } catch (err) {
      setError(formatRequestError(err, "Analysis failed. Please check the file and try again. / 分析失败，请检查文件后重试。"));
    } finally {
      setLoadingAnalysis(false);
    }
  }

  async function handleGenerateExplanation() {
    if (!analysis) {
      return;
    }

    setLoadingExplanation(true);
    setError(null);
    setExplanation(null);
    setMarkdownReport("");
    setCopyMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/explain/analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysis,
          language: "zh-CN",
          level: "student",
        }),
      });
      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Explanation generation failed. Please try again. / 解释生成失败，请重试。"));
      }
      const payload = await response.json();
      setExplanation(payload);
    } catch (err) {
      setError(formatRequestError(err, "Explanation generation failed. Please try again. / 解释生成失败，请重试。"));
    } finally {
      setLoadingExplanation(false);
    }
  }

  function resetState() {
    setFile(null);
    setMusicXmlText(null);
    setAnalysis(null);
    setExplanation(null);
    setMarkdownReport("");
    setCopyMessage(null);
    setNoteRoleFilter("all");
    setNoteContextFilter("all");
    setAnalysisView("student");
    setScoreRenderError(null);
    setRenderingScore(false);
    setError(null);
    if (scoreContainerRef.current) {
      scoreContainerRef.current.innerHTML = "";
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleGenerateMarkdownReport() {
    if (!analysis) {
      return;
    }
    setMarkdownReport(generateMarkdownReport(analysis, explanation, measuresWithChords));
    setCopyMessage(null);
  }

  async function handleCopyReport() {
    if (!markdownReport) {
      return;
    }
    if (!navigator.clipboard) {
      setCopyMessage("Clipboard is not available in this browser. Please select and copy the report text manually. / 此浏览器不支持剪贴板，请手动选择并复制报告内容。");
      return;
    }
    try {
      await navigator.clipboard.writeText(markdownReport);
      setCopyMessage("Learning report copied to clipboard. / 学习报告已复制到剪贴板。");
    } catch {
      setCopyMessage("Clipboard is not available in this browser. Please select and copy the report text manually. / 此浏览器不支持剪贴板，请手动选择并复制报告内容。");
    }
  }

  function handleDownloadReport() {
    if (!markdownReport) {
      return;
    }
    const blob = new Blob([markdownReport], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const baseName = file?.name
      ? file.name.replace(/\.(musicxml|xml)$/i, "")
      : null;
    anchor.href = url;
    anchor.download = baseName ? `${baseName}-learning-report.md` : "scoremind-learning-report.md";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  return (
    <main className="page-shell">
      <section className="workspace">
        <header className="page-header">
          <div>
            <p className="eyebrow">MVP 3.5</p>
            <h1>ScoreMind</h1>
            <p className="product-subtitle">AI Music Score Understanding</p>
          </div>
          <p className="api-url">API: {API_BASE_URL}</p>
        </header>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Score Input Workspace</h2>
              <p className="panel-note">
                ScoreMind currently analyzes structured MusicXML. Other score sources are shown to clarify the roadmap, not as runtime features.
              </p>
            </div>
          </div>

          <div className="input-workspace">
            <div className="input-source-list" aria-label="Score source selector">
              {INPUT_SOURCE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`input-source-option ${inputSource === option.id ? "active" : ""}`}
                  onClick={() => setInputSource(option.id)}
                >
                  <span>{option.label}</span>
                  <strong className={`source-status ${option.statusClass}`}>{option.status}</strong>
                </button>
              ))}
            </div>

            <div className="input-guidance-card">
              <div className="source-heading">
                <div>
                  <h3>{selectedInputSource.label}</h3>
                  <p>{selectedInputSource.message}</p>
                </div>
                <span className={`source-status large ${selectedInputSource.statusClass}`}>
                  {selectedInputSource.status}
                </span>
              </div>

              {selectedInputSource.id === "musicxml" ? (
                <>
                  <form className="upload-row" onSubmit={handleAnalyze}>
                    <label className="file-control">
                      <span>MusicXML / XML</span>
                      <input ref={fileInputRef} type="file" accept=".musicxml,.xml" onChange={handleFileChange} />
                    </label>
                    <button type="submit" disabled={!file || loadingAnalysis}>
                      {loadingAnalysis ? "Analyzing..." : "Analyze"}
                    </button>
                    <button type="button" className="secondary-button" onClick={resetState}>
                      Reset
                    </button>
                  </form>

                  <div className="sample-links-panel">
                    <h3>Try sample files</h3>
                    <p>No MusicXML file yet? Download a sample score and upload it to try the demo.</p>
                    <ul>
                      <li>
                        <a href="/samples/c_major_progression.musicxml" download>
                          C major progression sample
                        </a>
                        : demonstrates key, Roman numerals, harmonic functions, and Measure Walkthrough.
                      </li>
                      <li>
                        <a href="/samples/carried_context_notes.musicxml" download>
                          Carried context note-level sample
                        </a>
                        : demonstrates note-level chord tone labels and carried previous chord context.
                      </li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="unsupported-source-note">
                  <p>
                    This source is guidance-only in MVP 3.5. The runtime upload control still accepts only
                    {" "}.musicxml and .xml files after you export or convert externally.
                  </p>
                </div>
              )}
            </div>
          </div>

          {file && (
            <div className="score-preview-wrap">
              {renderingScore && <p className="empty-state">Rendering score preview... / 正在渲染乐谱预览...</p>}
              {scoreRenderError && <div className="inline-warning">{scoreRenderError}</div>}
              <div ref={scoreContainerRef} className="score-preview" aria-label="Rendered MusicXML score preview" />
            </div>
          )}
        </section>

        <section className="info-grid" aria-label="Prototype testing guidance">
          <div className="info-panel">
            <h2>About this demo</h2>
            <ul>
              <li>This is a deterministic MusicXML score understanding demo for music students.</li>
              <li>It helps students read chord, key, Roman numeral, harmonic function, note-level harmony relationships, and conservative non-chord tone candidate hints.</li>
              <li>It does not support PDF/image/OMR or real LLM reasoning yet.</li>
            </ul>
          </div>
          <div className="info-panel">
            <h2>Current Scope</h2>
            <ul>
              <li>Supports MusicXML/XML only.</li>
              <li>Does not support PDF/image/OMR.</li>
              <li>Renders MusicXML score preview for visual verification only.</li>
              <li>Does not use real LLM/OpenAI.</li>
              <li>Analysis is deterministic and backend-generated.</li>
              <li>Includes conservative note-level chord-tone labeling with carried context.</li>
              <li>Adds conservative non-chord tone candidate hints (passing/neighbor) for student learning only.</li>
              <li>Note filters and summaries are frontend-only usability tools.</li>
              <li>Student View explains the same deterministic result in plain Chinese.</li>
              <li>Process Explanation turns existing analysis output into a step-by-step reading path.</li>
              <li>Measure Walkthrough explains each measure from existing deterministic results.</li>
              <li>Terminology Guide gives static learning hints without adding new analysis.</li>
              <li>The main workflow is deterministic MusicXML analysis and learning-report export.</li>
            </ul>
          </div>
          <div className="info-panel">
            <h2>Demo Flow</h2>
            <ul>
              <li>Upload a .musicxml or .xml file.</li>
              <li>Use backend/tests/fixtures/carried_context_notes.musicxml as a sample if available.</li>
              <li>Click Analyze.</li>
              <li>Read Student Analysis first, then open Technical Evidence if you want details.</li>
              <li>Click Generate Explanation.</li>
              <li>Generate the Learning Report to export the current deterministic result.</li>
            </ul>
          </div>
          <div className="info-panel">
            <h2>Validation Dataset</h2>
            <ul>
              <li>Use backend/tests/fixtures/c_major_progression.musicxml for the basic Roman numeral workflow.</li>
              <li>Use backend/tests/fixtures/carried_context_notes.musicxml for the note-level carried context workflow.</li>
              <li>Validation fixtures are intentionally simple; complex repertoire is out of scope for this MVP.</li>
              <li>Use docs/VALIDATION_REPORT_TEMPLATE.md to record repeatable accuracy reviews.</li>
            </ul>
          </div>
        </section>

        {error && <div className="error-box">{error}</div>}

        {analysis && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Student Analysis / 学生视角分析</h2>
                <p className="panel-note">
                  A student-facing reading flow generated only from deterministic backend analysis.
                </p>
              </div>
              <button type="button" onClick={handleGenerateExplanation} disabled={loadingExplanation}>
                {loadingExplanation ? "Generating..." : "Generate Explanation"}
              </button>
            </div>

            <dl className="summary-grid">
              <div>
                <dt>Global Key</dt>
                <dd>
                  {analysis.key_analysis.tonic && analysis.key_analysis.mode
                    ? `${analysis.key_analysis.tonic} ${analysis.key_analysis.mode}`
                    : "Unavailable"}
                  <span className="summary-subtext">Confidence: {analysis.key_analysis.confidence ?? "N/A"}</span>
                </dd>
              </div>
              <div>
                <dt>Detected Chords</dt>
                <dd>{detectedChordCount}</dd>
              </div>
              <div>
                <dt>Analyzed Notes</dt>
                <dd>{noteRoleCounts.total}</dd>
              </div>
              <div>
                <dt>Current Scope / Reliability</dt>
                <dd>
                  Deterministic MusicXML analysis
                  <span className="summary-subtext">Same-offset first; carried context is conservative.</span>
                </dd>
              </div>
            </dl>

            <div className="view-toggle" aria-label="Student analysis view selector">
              <button
                type="button"
                className={analysisView === "student" ? "active" : ""}
                onClick={() => setAnalysisView("student")}
              >
                Student View
              </button>
              <button
                type="button"
                className={analysisView === "technical" ? "active" : ""}
                onClick={() => setAnalysisView("technical")}
              >
                Technical Evidence / 技术证据
              </button>
            </div>

            {analysisView === "student" && studentSummary && (
              <section className="student-view" aria-label="Student-friendly analysis summary">
                <div className="student-card">
                  <h3>整体调性</h3>
                  <p>{studentSummary.keySummary}</p>
                </div>
                <div className="student-card">
                  <h3>前 8 个和弦</h3>
                  {studentSummary.chordLines.length > 0 ? (
                    <ol className="student-list">
                      {studentSummary.chordLines.map((line, index) => (
                        <li key={`${index}-${line}`}>{line}</li>
                      ))}
                    </ol>
                  ) : (
                    <p>当前分析没有检测到可展示的和弦。</p>
                  )}
                </div>
                <div className="student-card">
                  <h3>音符与和声关系</h3>
                  <p>{studentSummary.noteSummary}</p>
                </div>
                <div className="student-card">
                  <h3>Process Explanation / 分析步骤</h3>
                  <ol className="process-list">
                    {studentSummary.processSteps.map((step) => (
                      <li key={step.title}>
                        <strong>{step.title}</strong>
                        <ul>
                          {step.lines.map((line) => (
                            <li key={`${step.title}-${line}`}>{line}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="student-card">
                  <h3>Measure Walkthrough / 小节导读</h3>
                  {studentSummary.measureWalkthroughs.length > 0 ? (
                    <div className="walkthrough-list">
                      {studentSummary.measureWalkthroughs.map((walkthrough) => (
                        <section key={walkthrough.measureNumber} className="walkthrough-card">
                          <h4>第 {walkthrough.measureNumber} 小节</h4>
                          <div className="walkthrough-block">
                            <strong>和弦</strong>
                            <ul>
                              {walkthrough.chordSummaries.map((line) => (
                                <li key={`${walkthrough.measureNumber}-${line}`}>{line}</li>
                              ))}
                            </ul>
                          </div>
                          <p className="walkthrough-harmonic-context">{walkthrough.harmonicContextSummary}</p>
                          <p className="walkthrough-summary">{walkthrough.noteRelationshipSentence}</p>
                          <p>{walkthrough.readingGuide}</p>
                          {walkthrough.cautions.length > 0 && (
                            <div className="walkthrough-cautions">
                              <strong>注意</strong>
                              <ul>
                                {walkthrough.cautions.map((line) => (
                                  <li key={`${walkthrough.measureNumber}-${line}`}>{line}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </section>
                      ))}
                    </div>
                  ) : (
                    <p>当前没有可生成小节导读的和弦或音符级分析。</p>
                  )}
                </div>
                <div className="student-card">
                  <h3>上下文怎么理解</h3>
                  <ul className="student-list">
                    {studentSummary.contextExplanation.map((line, index) => (
                      <li key={`${index}-${line}`}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="student-card">
                  <h3>学习提示</h3>
                  <ul className="student-list">
                    {LEARNING_HINTS.map((line, index) => (
                      <li key={`${index}-${line}`}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="student-card">
                  <h3>Terminology Guide / 术语指南</h3>
                  <dl className="terminology-list">
                    {TERMINOLOGY_GUIDE.map((item) => (
                      <div key={item.term}>
                        <dt>{item.term}</dt>
                        <dd>{item.explanation}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="student-card">
                  <h3>当前限制</h3>
                  <ul className="student-list">
                    {studentSummary.limitations.map((line, index) => (
                      <li key={`${index}-${line}`}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="student-card subtle-card">
                  <h3>后端提示</h3>
                  <ul className="student-list">
                    {studentSummary.warnings.map((line, index) => (
                      <li key={`${index}-${line}`}>{line}</li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {analysisView === "technical" && (
              <>
                <h3>Technical Evidence / 技术证据</h3>
                <p className="panel-note">
                  Detailed cards, filters, evidence, warnings, and validation hints for checking the deterministic result.
                </p>
                <section className="capability-panel" aria-label="Current automatic analysis capabilities">
                  <div>
                    <h3>What this analysis can do</h3>
                    <ul>
                      <li>Basic chord analysis.</li>
                      <li>Global-key Roman numeral analysis.</li>
                      <li>Same-offset chord-tone labeling.</li>
                      <li>Conservative carried previous chord context.</li>
                      <li>Conservative non-chord tone candidate hints (learning only).</li>
                    </ul>
                  </div>
                  <div>
                    <h3>What this analysis cannot do yet</h3>
                    <ul>
                      <li>Full classical non-chord tone classification.</li>
                      <li>Full sustained harmony inference.</li>
                      <li>Definitive passing/neighbor tone classification.</li>
                      <li>Melody or voice-leading analysis.</li>
                      <li>Local modulation.</li>
                      <li>Jazz or modern harmony.</li>
                      <li>PDF/image/OMR.</li>
                    </ul>
                  </div>
                </section>

                <h3>Technical Summary</h3>
                <dl className="summary-grid compact-grid">
                  <div>
                    <dt>File</dt>
                    <dd>{analysis.file_name}</dd>
                  </div>
                  <div>
                    <dt>Analysis Version</dt>
                    <dd>{analysis.analysis_version}</dd>
                  </div>
                </dl>
                <NoteSummaryGrid summary={noteRoleCounts} />

                <h3>Detailed Chord Cards</h3>
                {measuresWithChords.length > 0 ? (
                  <div className="measure-list">
                    {measuresWithChords.map((measure) => (
                      <section key={measure.measure_number} className="measure-card">
                        <h3>Measure {measure.measure_number}</h3>
                        <div className="measure-chords">
                          {measure.detected_chords.map((chord, index) => {
                            const reliability = getReliability(chord);
                            return (
                              <div key={`${measure.measure_number}-${chord.beat}-${index}`} className="measure-chord">
                                <div>
                                  <dt>Measure</dt>
                                  <dd>{measure.measure_number}</dd>
                                </div>
                                <div>
                                  <dt>Pitches</dt>
                                  <dd>{chord.pitches.join(", ")}</dd>
                                </div>
                                <div>
                                  <dt>Chord</dt>
                                  <dd>{formatChordLabel(chord)}</dd>
                                </div>
                                <div>
                                  <dt>Roman</dt>
                                  <dd>{chord.roman_numeral ?? "N/A"}</dd>
                                </div>
                                <div>
                                  <dt>Function</dt>
                                  <dd>{chord.harmonic_function}</dd>
                                </div>
                                <div>
                                  <dt>Evidence</dt>
                                  <dd>[{chord.evidence.interval_pattern.join(", ")}]</dd>
                                </div>
                                <div>
                                  <dt>Reliability</dt>
                                  <dd>
                                    <span className={`reliability-pill ${reliability.className}`}>
                                      {reliability.label}
                                    </span>
                                  </dd>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">No chord analysis was returned for this score. / 此乐谱未返回和弦分析结果。</p>
                )}

                <h3>Note-Level Analysis</h3>
                <p className="panel-note">
                  Note-level analysis checks whether each note belongs to the detected same-offset harmony.
                  If none exists, it may use the nearest earlier detected chord in the same measure.
                </p>
                <p className="panel-note">
                  Carried previous chord means the system uses the nearest earlier detected chord in the same measure as a conservative context.
                  This is not full sustained harmony inference.
                </p>
                <p className="panel-note">
                  Carried context results are less certain than same-offset results because they reuse the nearest earlier detected chord in the same measure.
                </p>
                <p className="panel-note">
                  Filters only change what is displayed in the browser. They do not change backend analysis.
                </p>
                <p className="panel-note">
                  Note-level analysis is a conservative harmony-membership check, not full melodic analysis.
                </p>
                {noteRoleCounts.noContext > 0 && (
                  <div className="inline-warning">
                    Some notes have no harmony context because no same-offset or earlier detected chord exists in the measure.
                  </div>
                )}
                <div className="filter-row" aria-label="Note-level display filters">
                  <label>
                    <span>Role Filter</span>
                    <select
                      value={noteRoleFilter}
                      onChange={(event) => setNoteRoleFilter(event.target.value as NoteRoleFilter)}
                    >
                      <option value="all">All</option>
                      <option value="chord_tone">Chord tones</option>
                      <option value="non_chord_tone">Non-chord tone candidates</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </label>
                  <label>
                    <span>Context Filter</span>
                    <select
                      value={noteContextFilter}
                      onChange={(event) => setNoteContextFilter(event.target.value as NoteContextFilter)}
                    >
                      <option value="all">All</option>
                      <option value="same_offset">Same offset harmony</option>
                      <option value="carried_previous_chord">Carried previous chord</option>
                      <option value="none">No harmony context</option>
                    </select>
                  </label>
                </div>
                <p className="panel-note">
                  Global summary above is based on the full backend result. Per-measure summaries below follow the active browser filters.
                </p>
                {measuresWithAnalyzedNotes.length > 0 && filteredMeasuresWithAnalyzedNotes.length > 0 ? (
                  <div className="note-analysis-list">
                    {filteredMeasuresWithAnalyzedNotes.map((measure) => {
                      const measureSummary = summarizeNotes(measure.analyzed_notes);
                      return (
                        <section key={`notes-${measure.measure_number}`} className="measure-card">
                          <h3>Measure {measure.measure_number}</h3>
                          <NoteSummaryGrid summary={measureSummary} />
                          <div className="note-grid">
                            {measure.analyzed_notes.map((note, index) => (
                              <div
                                key={`${measure.measure_number}-${note.offset}-${note.pitch}-${index}`}
                                className="note-card"
                              >
                                <div>
                                  <dt>Pitch</dt>
                                  <dd>{note.pitch}</dd>
                                </div>
                                <div>
                                  <dt>Beat</dt>
                                  <dd>{note.beat ?? "N/A"}</dd>
                                </div>
                                <div>
                                  <dt>Role</dt>
                                  <dd>
                                    <span className={`role-pill ${note.role.replaceAll("_", "-")}`}>
                                      {formatNoteRoleLabel(note.role)}
                                    </span>
                                  </dd>
                                </div>
                                <div>
                                  <dt>Related Chord</dt>
                                  <dd>{formatRelatedChord(note)}</dd>
                                </div>
                                <div>
                                  <dt>Context</dt>
                                  <dd>
                                    <span className={`context-pill ${note.evidence.context_source.replaceAll("_", "-")}`}>
                                      {formatContextSource(note.evidence.context_source)}
                                    </span>
                                    {note.evidence.context_source === "carried_previous_chord" && (
                                      <span className="context-note">Carried context</span>
                                    )}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Context Reliability</dt>
                                  <dd>
                                    <span className={`context-reliability ${note.evidence.context_source.replaceAll("_", "-")}`}>
                                      {formatContextReliability(note.evidence.context_source)}
                                    </span>
                                  </dd>
                                </div>
                                <div>
                                  <dt>Possible Type</dt>
                                  <dd>{note.possible_non_chord_tone_type ?? "N/A"}</dd>
                                </div>
                                {note.non_chord_tone_candidate && note.non_chord_tone_candidate.kind !== "not_applicable" && (
                                  <div className="note-nct-candidate">
                                    <dt>NCT Candidate</dt>
                                    <dd>
                                      <span className={`nct-kind nct-${note.non_chord_tone_candidate.kind}`}>
                                        {formatNctKind(note.non_chord_tone_candidate.kind)}
                                      </span>
                                      <span className="nct-confidence">Confidence: {note.non_chord_tone_candidate.confidence}</span>
                                      <span className="nct-reason">{note.non_chord_tone_candidate.reason}</span>
                                    </dd>
                                  </div>
                                )}
                                <div className="note-reason">
                                  <dt>Reason</dt>
                                  <dd>
                                    {formatNoteReason(note.evidence.reason)}
                                    <span className="reason-code">Code: {note.evidence.reason}</span>
                                  </dd>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                ) : measuresWithAnalyzedNotes.length > 0 ? (
                  <p className="empty-state">No notes match the current filters. Try changing the filter settings. / 没有音符匹配当前筛选条件，请尝试调整筛选设置。</p>
                ) : (
                  <p className="empty-state">No note-level analysis was returned for this score. / 此乐谱未返回音符级分析结果。</p>
                )}

                <h3>Warnings / Validation Hints</h3>
                <ul className="warning-list">
                  {analysis.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
                <p className="panel-note validation-note">
                  For repeatable validation, use docs/VALIDATION.md and the fixtures in backend/tests/fixtures.
                </p>
              </>
            )}
          </section>
        )}

        {analysis && (
          <>
            {explanation && (
              <section className="panel">
                <h2>Template Explanation</h2>
                <dl className="summary-grid compact-grid">
                  <div>
                    <dt>Explanation Version</dt>
                    <dd>{explanation.explanation_version}</dd>
                  </div>
                </dl>
                <p className="summary-text">{explanation.summary}</p>
                <div className="section-list">
                  {explanation.sections.map((section) => (
                    <section key={section.title} className="explanation-section">
                      <h3>{section.title}</h3>
                      <p>{section.text}</p>
                    </section>
                  ))}
                </div>
                <h3>Explanation Warnings</h3>
                <ul className="warning-list">
                  {explanation.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {analysis && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Export Learning Report / 导出学习报告</h2>
                <p className="panel-note">
                  Generate a Markdown learning report from the current backend analysis only. No PDF export or extra AI reasoning is added.
                </p>
              </div>
              <button type="button" onClick={handleGenerateMarkdownReport}>
                Generate Learning Report
              </button>
            </div>

            {markdownReport && (
              <div className="report-block">
                <div className="panel-header">
                  <h3>Learning Report</h3>
                  <div className="report-actions">
                    <button type="button" className="secondary-button" onClick={handleCopyReport}>
                      Copy Learning Report
                    </button>
                    <button type="button" className="secondary-button" onClick={handleDownloadReport}>
                      Download Learning Report
                    </button>
                  </div>
                </div>
                <p className="panel-note report-disclaimer">
                  The report is generated from deterministic backend analysis only. No PDF export or extra AI reasoning is added.
                </p>
                {copyMessage && <p className="copy-message">{copyMessage}</p>}
                <textarea readOnly value={markdownReport} rows={18} aria-label="Generated learning report" />
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

function NoteSummaryGrid({ summary }: { summary: NoteSummary }) {
  return (
    <dl className="note-summary-grid">
      <div>
        <dt>Total Notes</dt>
        <dd>{summary.total}</dd>
      </div>
      <div>
        <dt>Chord Tones</dt>
        <dd>{summary.chordTone}</dd>
      </div>
      <div>
        <dt>Non-Chord Candidates</dt>
        <dd>{summary.nonChordTone}</dd>
      </div>
      <div>
        <dt>Unknown Notes</dt>
        <dd>{summary.unknown}</dd>
      </div>
      <div>
        <dt>Same Offset</dt>
        <dd>{summary.sameOffset}</dd>
      </div>
      <div>
        <dt>Carried Context</dt>
        <dd>{summary.carriedContext}</dd>
      </div>
      <div>
        <dt>No Context</dt>
        <dd>{summary.noContext}</dd>
      </div>
    </dl>
  );
}

function isSupportedFile(fileName: string) {
  const lowerName = fileName.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}

async function getApiErrorMessage(response: Response, fallback: string) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const payload: unknown = await response.json();
      if (isDetailResponse(payload)) {
        return Array.isArray(payload.detail) ? JSON.stringify(payload.detail) : String(payload.detail);
      }
    } catch {
      return fallback;
    }
  }

  try {
    const text = await response.text();
    return text || fallback;
  } catch {
    return fallback;
  }
}

function isDetailResponse(value: unknown): value is { detail: unknown } {
  return typeof value === "object" && value !== null && "detail" in value;
}

function formatRequestError(error: unknown, fallback: string) {
  if (error instanceof TypeError) {
    return `Cannot reach the backend at ${API_BASE_URL}. Please make sure the FastAPI server is running. / 无法连接到后端 ${API_BASE_URL}，请确认 FastAPI 服务已启动。`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function formatChordLabel(chord: DetectedChord) {
  if (!chord.root || chord.quality === "unknown") {
    return chord.quality;
  }
  return `${chord.root} ${chord.quality}`;
}

function getReliability(chord: DetectedChord): Reliability {
  if (chord.quality === "unknown") {
    return { label: "Unsupported", className: "unsupported" };
  }
  if (chord.roman_numeral && chord.harmonic_function !== "unknown") {
    return { label: "Supported", className: "supported" };
  }
  return { label: "Needs review", className: "needs-review" };
}

function emptyNoteSummary(): NoteSummary {
  return {
    total: 0,
    chordTone: 0,
    nonChordTone: 0,
    unknown: 0,
    sameOffset: 0,
    carriedContext: 0,
    noContext: 0,
    passingCandidate: 0,
    neighborCandidate: 0,
    unknownNctCandidate: 0,
  };
}

function summarizeNotes(notes: AnalyzedNote[]): NoteSummary {
  const summary = emptyNoteSummary();
  for (const note of notes) {
    summary.total += 1;
    if (note.role === "chord_tone") {
      summary.chordTone += 1;
    } else if (note.role === "non_chord_tone") {
      summary.nonChordTone += 1;
    } else {
      summary.unknown += 1;
    }

    if (note.evidence.context_source === "same_offset") {
      summary.sameOffset += 1;
    } else if (note.evidence.context_source === "carried_previous_chord") {
      summary.carriedContext += 1;
    } else {
      summary.noContext += 1;
    }

    if (note.non_chord_tone_candidate) {
      if (note.non_chord_tone_candidate.kind === "passing_tone_candidate") {
        summary.passingCandidate += 1;
      } else if (note.non_chord_tone_candidate.kind === "neighbor_tone_candidate") {
        summary.neighborCandidate += 1;
      } else if (note.non_chord_tone_candidate.kind === "unknown_non_chord_tone_candidate") {
        summary.unknownNctCandidate += 1;
      }
    }
  }
  return summary;
}

function buildStudentSummary(analysis: MusicXMLAnalysisResponse): StudentSummary {
  const chords = analysis.measures.flatMap((measure) => measure.detected_chords);
  const noteSummary = summarizeNotes(analysis.measures.flatMap((measure) => measure.analyzed_notes ?? []));
  const keySummary =
    analysis.key_analysis.tonic && analysis.key_analysis.mode
      ? `系统检测到的全局调性为 ${analysis.key_analysis.tonic} ${analysis.key_analysis.mode}，后续和弦级数和功能判断都基于这个调性。`
      : "系统没有检测到可靠的全局调性，后续罗马数字和功能标签需要更谨慎阅读。";

  const chordLines = chords.slice(0, 8).map((chord) => {
    const chordLabel = formatChordLabel(chord);
    const functionLabel = formatHarmonicFunctionForStudent(chord.harmonic_function);
    const romanText = chord.roman_numeral
      ? `对应 ${chord.roman_numeral} 级`
      : "罗马数字不在当前支持范围内";
    return `第 ${chord.measure_number} 小节：${chordLabel}，${romanText}，功能为 ${functionLabel}。`;
  });

  if (chords.length > 8) {
    chordLines.push(`还有 ${chords.length - 8} 个和弦未在此展示，可切换到 Technical Evidence 查看完整列表。`);
  }

  const limitations = [
    "这里展示的都是后端已有的分析结果，只是换成了更容易理解的中文，不会新增任何音乐理论结论。",
    "非和弦音候选只表示该音不属于当前和弦上下文，不等于已经判断它是经过音或辅助音。",
    "系统提供保守的非和弦音候选提示（如可能的经过音、可能的辅助音），但这不是完整的古典非和弦音分类，也不能识别 suspension、appoggiatura 等更复杂类型。",
    "系统还不能做完整旋律分析、声部进行分析、局部转调或持续和声推断。",
  ];

  return {
    keySummary,
    chordLines,
    noteSummary:
      noteSummary.total > 0
        ? `系统共分析了 ${noteSummary.total} 个音的和声归属。具体分类可在 Technical Evidence 中查看。`
        : "当前乐谱没有返回可展示的音符级分析。",
    contextExplanation: [
      "同拍点和声（same offset）：音符和和弦同时出现，是最直接的参考。",
      "沿用前和弦（carried previous chord）：当前拍点没有新和弦时，系统沿用同小节内最近的和弦，可信度稍弱。",
      "无上下文（none）：该拍点没有可用和弦，系统暂不判断。",
    ],
    processSteps: buildProcessSteps(analysis, chords, chordLines, noteSummary, limitations),
    measureWalkthroughs: buildMeasureWalkthroughs(analysis.measures),
    limitations,
    warnings: analysis.warnings,
  };
}

function buildProcessSteps(
  analysis: MusicXMLAnalysisResponse,
  chords: DetectedChord[],
  chordLines: string[],
  noteSummary: NoteSummary,
  limitations: string[],
): ProcessStep[] {
  const keyLine =
    analysis.key_analysis.tonic && analysis.key_analysis.mode
      ? `系统检测到的全局调性为 ${analysis.key_analysis.tonic} ${analysis.key_analysis.mode}。后续所有和弦级数和功能判断都基于这个调性。`
      : "系统没有检测到可靠的全局调性，后续罗马数字和功能标签需要更谨慎阅读。";
  const chordProgressionLines =
    chords.length > 0 ? chordLines.slice(0, 8) : ["当前乐谱没有检测到可展示的和弦进行。"];
  const warningLines = analysis.warnings.length > 0 ? analysis.warnings : ["后端没有返回额外提示。"];

  return [
    {
      title: "第一步：全局调性",
      lines: [keyLine],
    },
    {
      title: "第二步：和弦进行",
      lines: chordProgressionLines,
    },
    {
      title: "第三步：和声功能",
      lines: [
        "tonic（主功能）：听感上比较稳定，像回到了中心。",
        "predominant（下属功能）：通常为属功能做铺垫。",
        "dominant（属功能）：带有走向主功能的倾向。",
        "unknown：系统没有足够信息来判断功能归属。",
      ],
    },
    {
      title: "第四步：音符与和声关系",
      lines: [
        `当前共分析 ${noteSummary.total} 个音。具体分类可在 Technical Evidence 中查看。`,
        "chord tone（和弦音）：该音属于当前和弦。",
        "non-chord tone candidate（非和弦音候选）：该音不属于当前和弦，系统会基于相邻音符给出保守的类型候选提示（如可能的经过音、可能的辅助音）。",
        "unknown：当前没有可用和声上下文，暂不判断。",
      ],
    },
    {
      title: "第五步：上下文可信度",
      lines: [
        "同拍点和声（same offset）：最直接的参考，可信度最高。",
        "沿用前和弦（carried previous chord）：保守参考，可信度稍弱。",
        "无上下文（none）：没有可用和弦，暂不判断。",
      ],
    },
    {
      title: "第六步：需要注意的限制",
      lines: [...limitations, ...warningLines],
    },
  ];
}

function buildMeasureWalkthroughs(measures: MeasureAnalysis[]): MeasureWalkthrough[] {
  return measures
    .filter((measure) => measure.detected_chords.length > 0 || (measure.analyzed_notes ?? []).length > 0)
    .map((measure) => {
      const noteSummary = summarizeNotes(measure.analyzed_notes ?? []);
      const chordSummaries =
        measure.detected_chords.length > 0
          ? measure.detected_chords.map((chord) => {
              const chordLabel = formatChordLabel(chord);
              const romanText = chord.roman_numeral ? `，对应 ${chord.roman_numeral} 级` : "，罗马数字不在当前支持范围内";
              const functionLabel = formatHarmonicFunctionForStudent(chord.harmonic_function);
              return `检测到和弦参考：${chordLabel}${romanText}，功能上${functionLabel}。`;
            })
          : ["当前小节没有检测到可展示的和弦。"];
      const ctx = measure.harmonic_context;
      const harmonicContextSummary = buildHarmonicContextSummary(ctx);
      const cautions: string[] = [];
      if (!ctx || ctx.confidence === "low") {
        cautions.push("本小节没有可用的和声上下文，无法给出和弦级数和功能判断。");
      } else if (ctx.confidence === "partial") {
        cautions.push("本小节检测到和弦，但罗马数字或功能标签不在当前支持范围内。");
      }
      if (noteSummary.carriedContext > 0) {
        cautions.push("本小节有音符使用了沿用前和弦（carried context），说明系统沿用了同小节前面的和弦作为参考。");
      }
      if (noteSummary.unknown > 0) {
        cautions.push("本小节有音符缺少可用和声上下文，系统暂不判断其归属。");
      }

      return {
        measureNumber: measure.measure_number,
        chordSummaries,
        noteSummary,
        noteRelationshipSentence: buildMeasureNoteRelationshipSentence(noteSummary),
        readingGuide: "先看这一小节的和弦，再看它在全局调性中的级数，最后看音符是否属于当前和声。",
        harmonicContextSummary,
        cautions,
      };
    });
}

function buildHarmonicContextSummary(ctx?: MeasureHarmonicContext | null): string {
  if (!ctx || ctx.confidence === "low") {
    return "本小节没有可用的和声参考。";
  }
  const label = ctx.selected_chord_label ?? "unknown";
  const roman = ctx.selected_roman_numeral ? ` / ${ctx.selected_roman_numeral}` : "";
  const func = formatHarmonicFunctionForStudent(ctx.selected_harmonic_function);
  const confidenceLabel = ctx.confidence === "supported" ? "可信" : "部分支持";
  const multiWarning = ctx.warnings.some((w) => w.includes("Multiple detected chords"))
    ? "（本小节有多个和弦，此处为参考选择）"
    : "";
  return `选定和声参考：${label}${roman}，功能为${func}（${confidenceLabel}）${multiWarning}。`;
}

function buildMeasureNoteRelationshipSentence(summary: NoteSummary) {
  if (summary.total === 0) {
    return "本小节没有可展示的音符级分析。";
  }
  if (summary.chordTone === summary.total) {
    return `本小节所有 ${summary.total} 个分析音都属于当前和声。`;
  }
  const parts: string[] = [];
  if (summary.chordTone > 0) {
    parts.push(`${summary.chordTone} 个属于当前和声`);
  }
  if (summary.nonChordTone > 0) {
    parts.push(`${summary.chordTone > 0 ? "" : "有"}${summary.nonChordTone} 个非和弦音候选`);
  }
  if (summary.unknown > 0) {
    parts.push(`${summary.chordTone + summary.nonChordTone > 0 ? "" : "有"}${summary.unknown} 个缺少和声上下文`);
  }
  const nctParts: string[] = [];
  if (summary.passingCandidate > 0) {
    nctParts.push(`${summary.passingCandidate} 个可能是经过音`);
  }
  if (summary.neighborCandidate > 0) {
    nctParts.push(`${summary.neighborCandidate} 个可能是辅助音`);
  }
  const sentence = `本小节有 ${parts.join("，")}。`;
  if (nctParts.length > 0) {
    return `${sentence} 其中${nctParts.join("，")}（学习提示，不是最终结论）。`;
  }
  return sentence;
}

function formatHarmonicFunctionForStudent(harmonicFunction: string) {
  if (harmonicFunction === "tonic") {
    return "比较稳定（主功能）";
  }
  if (harmonicFunction === "predominant") {
    return "为属功能做铺垫（下属功能）";
  }
  if (harmonicFunction === "dominant") {
    return "倾向于解决到主功能（属功能）";
  }
  return "功能未知";
}

function formatRelatedChord(note: AnalyzedNote) {
  if (!note.related_chord) {
    return "N/A";
  }
  const root = note.related_chord.root ?? "unknown root";
  const roman = note.related_chord.roman_numeral ? ` / ${note.related_chord.roman_numeral}` : "";
  return `${root} ${note.related_chord.quality}${roman}`;
}

function formatNoteRoleLabel(role: AnalyzedNote["role"]) {
  if (role === "chord_tone") {
    return "Chord tone";
  }
  if (role === "non_chord_tone") {
    return "Non-chord tone candidate";
  }
  return "Unknown";
}

function formatNoteReason(reason: string) {
  if (reason === "note_pitch_class_matches_same_offset_chord") {
    return "The note pitch class is part of the detected chord at the same measure offset.";
  }
  if (reason === "note_pitch_class_not_in_same_offset_chord") {
    return "The note pitch class is not part of the detected chord at the same measure offset.";
  }
  if (reason === "note_pitch_class_matches_carried_previous_chord") {
    return "The note pitch class is part of the nearest earlier detected chord in this measure.";
  }
  if (reason === "note_pitch_class_not_in_carried_previous_chord") {
    return "The note pitch class is not part of the nearest earlier detected chord in this measure.";
  }
  if (reason === "no_harmony_context") {
    return "No same-offset or earlier detected chord is available in this measure.";
  }
  if (reason === "invalid_note_pitch") {
    return "The note pitch could not be parsed.";
  }
  return reason;
}

function formatContextSource(contextSource: AnalyzedNote["evidence"]["context_source"]) {
  if (contextSource === "same_offset") {
    return "Same offset harmony";
  }
  if (contextSource === "carried_previous_chord") {
    return "Carried previous chord";
  }
  return "No harmony context";
}

function formatNctKind(kind: NonChordToneCandidate["kind"]) {
  if (kind === "passing_tone_candidate") {
    return "可能的经过音候选";
  }
  if (kind === "neighbor_tone_candidate") {
    return "可能的辅助音候选";
  }
  if (kind === "unknown_non_chord_tone_candidate") {
    return "非和弦音候选（类型暂不确定）";
  }
  return "不适用";
}

function formatContextReliability(contextSource: AnalyzedNote["evidence"]["context_source"]) {
  if (contextSource === "same_offset") {
    return "Direct context";
  }
  if (contextSource === "carried_previous_chord") {
    return "Carried context / conservative";
  }
  return "No context";
}

function generateMarkdownReport(
  analysis: MusicXMLAnalysisResponse,
  explanation: ExplanationResponse | null,
  measures: MeasureAnalysis[],
) {
  const globalNoteSummary = summarizeNotes(analysis.measures.flatMap((measure) => measure.analyzed_notes ?? []));
  const measuresWithNoteAnalysis = analysis.measures.filter((measure) => (measure.analyzed_notes ?? []).length > 0);
  const studentSummary = buildStudentSummary(analysis);
  const keyText =
    analysis.key_analysis.tonic && analysis.key_analysis.mode
      ? `${analysis.key_analysis.tonic} ${analysis.key_analysis.mode}`
      : "Unavailable";
  const lines = [
    "# AI Music Score Understanding Learning Report",
    "",
    "## Metadata",
    "",
    `- File: ${analysis.file_name}`,
    `- Global key: ${keyText}`,
    `- Analysis version: ${analysis.analysis_version}`,
    `- Explanation version: ${explanation?.explanation_version ?? "Not generated"}`,
    "",
    "## Important Note",
    "",
    "The analysis below is deterministic and generated by the backend. The report restates existing analysis output and does not add new music-theory conclusions.",
    "",
    "## Student Summary",
    "",
    `- ${studentSummary.keySummary}`,
    `- ${studentSummary.noteSummary}`,
    "",
    "### Chord Progression Summary",
    "",
    ...formatStudentListForMarkdown(studentSummary.chordLines),
    "",
    "## Process Explanation",
    "",
    ...formatProcessStepsForMarkdown(studentSummary.processSteps.slice(0, 5)),
    "",
    "## Measure Walkthrough",
    "",
    ...formatMeasureWalkthroughsForMarkdown(studentSummary.measureWalkthroughs),
    "",
    "## Important Limitations",
    "",
    ...formatStudentListForMarkdown(studentSummary.limitations),
    "",
    "## Terminology and Reading Guide",
    "",
    ...formatStudentListForMarkdown(LEARNING_HINTS),
    "",
    ...formatTerminologyForMarkdown(TERMINOLOGY_GUIDE),
    "",
    "## Technical Details",
    "",
    "### Global Note-Level Summary",
    "",
    ...formatNoteSummaryForMarkdown(globalNoteSummary),
    "",
    "### Per-Measure Note-Level Summary",
    "",
  ];

  if (measuresWithNoteAnalysis.length === 0) {
    lines.push("No analyzed notes were available.", "");
  }

  for (const measure of measuresWithNoteAnalysis) {
    lines.push(`### Measure ${measure.measure_number}`, "");
    lines.push(...formatNoteSummaryForMarkdown(summarizeNotes(measure.analyzed_notes ?? [])));
    lines.push("");
  }

  lines.push(
    "### Chord Analysis Summary",
    "",
  );

  if (measures.length === 0) {
    lines.push("No detected chord measures were available.", "");
  }

  for (const measure of measures) {
    lines.push(`### Measure ${measure.measure_number}`, "");
    for (const chord of measure.detected_chords) {
      lines.push(`- Pitches: ${chord.pitches.join(", ")}`);
      lines.push(`  - Quality: ${chord.quality}`);
      lines.push(`  - Root: ${chord.root ?? "N/A"}`);
      lines.push(`  - Roman numeral: ${chord.roman_numeral ?? "N/A"}`);
      lines.push(`  - Harmonic function: ${chord.harmonic_function}`);
      lines.push(`  - Interval pattern: [${chord.evidence.interval_pattern.join(", ")}]`);
    }
    lines.push("");
  }

  lines.push("### Backend Warnings", "");
  if (analysis.warnings.length === 0) {
    lines.push("- None");
  } else {
    for (const warning of analysis.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return lines.join("\n");
}

function formatNoteSummaryForMarkdown(summary: NoteSummary) {
  const lines = [
    `- Total analyzed notes: ${summary.total}`,
    `- Chord tones: ${summary.chordTone}`,
    `- Non-chord tone candidates: ${summary.nonChordTone}`,
    `- Unknown notes: ${summary.unknown}`,
    `- Same-offset context notes: ${summary.sameOffset}`,
    `- Carried-context notes: ${summary.carriedContext}`,
    `- No-context notes: ${summary.noContext}`,
  ];
  if (summary.passingCandidate > 0 || summary.neighborCandidate > 0 || summary.unknownNctCandidate > 0) {
    lines.push("- Non-chord tone candidate details (learning hints, not final conclusions):");
    if (summary.passingCandidate > 0) {
      lines.push(`  - Possible passing tone candidates: ${summary.passingCandidate}`);
    }
    if (summary.neighborCandidate > 0) {
      lines.push(`  - Possible neighbor tone candidates: ${summary.neighborCandidate}`);
    }
    if (summary.unknownNctCandidate > 0) {
      lines.push(`  - Non-chord tone candidates (type uncertain): ${summary.unknownNctCandidate}`);
    }
  }
  return lines;
}

function formatStudentListForMarkdown(items: string[]) {
  if (items.length === 0) {
    return ["- None"];
  }
  return items.map((item) => `- ${item}`);
}

function formatTerminologyForMarkdown(items: TerminologyItem[]) {
  return items.map((item) => `- ${item.term}: ${item.explanation}`);
}

function formatProcessStepsForMarkdown(steps: ProcessStep[]) {
  const lines: string[] = [];
  for (const step of steps) {
    lines.push(`### ${step.title}`, "");
    lines.push(...formatStudentListForMarkdown(step.lines), "");
  }
  return lines;
}

function formatMeasureWalkthroughsForMarkdown(walkthroughs: MeasureWalkthrough[]) {
  if (walkthroughs.length === 0) {
    return ["No measure walkthrough entries were available."];
  }

  const lines: string[] = [];
  for (const walkthrough of walkthroughs) {
    lines.push(`### Measure ${walkthrough.measureNumber}`, "");
    lines.push(`- Harmonic context: ${walkthrough.harmonicContextSummary}`);
    lines.push("- Chords:");
    for (const chordSummary of walkthrough.chordSummaries) {
      lines.push(`  - ${chordSummary}`);
    }
    lines.push(`- Note relationship: ${walkthrough.noteRelationshipSentence}`);
    lines.push(`- Reading guide: ${walkthrough.readingGuide}`);
    if (walkthrough.cautions.length > 0) {
      lines.push("- Cautions:");
      for (const caution of walkthrough.cautions) {
        lines.push(`  - ${caution}`);
      }
    }
    lines.push("");
  }
  return lines;
}

import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { api } from '../api/client'

// PDF.js рендерит слайды на canvas; worker подключаем как asset Vite.
GlobalWorkerOptions.workerSrc = workerUrl

function errorText(err, fallback) {
  return err?.response?.data?.detail || fallback
}

function PresentationViewer({ slug }) {
  const [lesson, setLesson] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')

  const [pdfDoc, setPdfDoc] = useState(null)
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(0)
  const [pdfError, setPdfError] = useState('')
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)

  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const windowRef = useRef(null)

  // Синхронизируем состояние кнопки с нативным Fullscreen API
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === windowRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // 1. Данные урока (включая presentation_url)
  useEffect(() => {
    let cancelled = false
    api
      .get(`/api/lessons/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (cancelled) return
        setLesson(res.data)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setError(errorText(err, 'Не удалось загрузить урок.'))
        setStatus('error')
      })
    return () => { cancelled = true }
  }, [slug])

  // 2. Загрузка PDF
  useEffect(() => {
    const url = lesson?.presentation_url
    if (!url) return undefined

    let cancelled = false
    const task = getDocument({ url })

    task.promise
      .then((loaded) => {
        if (cancelled) return
        setPdfDoc(loaded)
        setPageCount(loaded.numPages)
        setPage(1)
      })
      .catch((err) => {
        if (cancelled || err?.name === 'AbortException') return
        setPdfError('Не удалось открыть файл презентации.')
      })

    return () => {
      cancelled = true
      // Владелец ресурсов — PDFDocumentLoadingTask: его destroy() закрывает
      // документ, transport и worker. У PDFDocumentProxy в PDF.js 6 метода
      // destroy() нет (был в старых версиях), поэтому вызываем только task.
      task.destroy().catch(() => {})
    }
  }, [lesson?.presentation_url])

  // 3. Размеры окна просмотра (в т.ч. при сворачивании сайдбара и fullscreen)
  useEffect(() => {
    const element = stageRef.current
    if (!element) return undefined

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      const width = Math.round(rect.width)
      const height = Math.round(rect.height)
      setStageSize((previous) => (
        previous.width === width && previous.height === height
          ? previous
          : { width, height }
      ))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [lesson])

  // 4. Отрисовка текущего слайда
  useEffect(() => {
    const { width: stageWidth, height: stageHeight } = stageSize
    if (!pdfDoc || !canvasRef.current || !stageWidth) return undefined

    let cancelled = false
    let renderTask = null
    const canvas = canvasRef.current

    pdfDoc
      .getPage(page)
      .then((pdfPage) => {
        if (cancelled) return undefined

        const base = pdfPage.getViewport({ scale: 1 })
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const widthScale = stageWidth / base.width
        // В обычном окне подгоняем по ширине, в fullscreen — вписываем
        // слайд целиком и по ширине, и по доступной высоте.
        const heightScale = isFullscreen && stageHeight
          ? stageHeight / base.height
          : widthScale
        const cssScale = Math.min(widthScale, heightScale)
        const viewport = pdfPage.getViewport({ scale: cssScale * dpr })

        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.style.width = `${Math.floor(base.width * cssScale)}px`
        canvas.style.height = `${Math.floor(base.height * cssScale)}px`

        const context = canvas.getContext('2d')
        renderTask = pdfPage.render({ canvas, canvasContext: context, viewport })
        return renderTask.promise
      })
      .catch((err) => {
        if (cancelled || err?.name === 'RenderingCancelledException') return
        setPdfError('Не удалось показать слайд.')
      })

    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [pdfDoc, page, stageSize, isFullscreen])

  // 5. Листание с клавиатуры
  useEffect(() => {
    if (!pdfDoc) return undefined
    const onKey = (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setPage((current) => Math.max(1, current - 1))
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        setPage((current) => Math.min(pageCount, current + 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pdfDoc, pageCount])

  const goPrev = () => setPage((current) => Math.max(1, current - 1))
  const goNext = () => setPage((current) => Math.min(pageCount, current + 1))

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await windowRef.current?.requestFullscreen()
      }
    } catch {
      // Браузер может запретить fullscreen (например, политика/старый Safari) —
      // в этом случае просто остаёмся в обычном окне.
    }
  }

  return (
    <div className="page">
      <div className="presentation-page">
        <Link to="/lessons" className="back-link">← К урокам</Link>

        {status === 'loading' && (
          <p className="text-secondary" role="status">Загружаем урок…</p>
        )}

        {status === 'error' && (
          <p className="field-error" role="alert">{error}</p>
        )}

        {status === 'ready' && lesson && (
          <>
            <header className="presentation-head">
              <p className="presentation-topic">{lesson.topic}</p>
              <h1 className="page-title presentation-title">{lesson.title}</h1>
              <p className="text-secondary">
                {lesson.duration_minutes} мин · {lesson.completed ? 'Пройден' : 'В программе'}
              </p>
            </header>

            {!lesson.presentation_url ? (
              <section className="card presentation-empty">
                <p>Презентация для этого урока пока не загружена.</p>
                <p className="text-secondary">
                  Материал появится здесь, когда администратор прикрепит его к уроку.
                </p>
              </section>
            ) : (
              <section
                className="presentation-window"
                ref={windowRef}
                aria-label="Просмотр презентации"
              >
                <div className="presentation-stage" ref={stageRef}>
                  <canvas
                    ref={canvasRef}
                    className="presentation-canvas"
                    aria-label={`Слайд ${page} из ${pageCount || '?'}`}
                  />
                  {!pdfDoc && !pdfError && (
                    <p className="presentation-status" role="status">Загружаем презентацию…</p>
                  )}
                  {pdfError && (
                    <p className="presentation-status field-error" role="alert">{pdfError}</p>
                  )}
                </div>

                <div className="presentation-controls">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={goPrev}
                    disabled={!pdfDoc || page <= 1}
                    aria-label="Предыдущий слайд"
                  >
                    ← Назад
                  </button>

                  <span className="presentation-counter" role="status" aria-live="polite">
                    {pdfDoc ? `${page} / ${pageCount}` : '— / —'}
                  </span>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={goNext}
                    disabled={!pdfDoc || page >= pageCount}
                    aria-label="Следующий слайд"
                  >
                    Вперёд →
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm presentation-fullscreen"
                    onClick={toggleFullscreen}
                    disabled={!pdfDoc}
                    aria-pressed={isFullscreen}
                    aria-label={isFullscreen ? 'Выйти из полноэкранного режима' : 'Открыть презентацию на весь экран'}
                    title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Открыть на весь экран'}
                  >
                    {isFullscreen ? 'Выйти' : 'На весь экран'}
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// key={slug} гарантирует сброс PDF/страницы при переходе между уроками.
export default function LessonPresentation() {
  const { slug } = useParams()
  return <PresentationViewer key={slug} slug={slug} />
}

import 'quill/dist/quill.snow.css'

import Quill from 'quill'
import QuillMarkdown from 'quilljs-markdown'

// Extend the built-in Image blot to preserve dt-data-path
const ImageBlot = Quill.import('formats/image')
class DtImageBlot extends ImageBlot {
  static create(value) {
    const node = super.create(typeof value === 'string' ? value : value.src)
    if (value?.path) node.setAttribute('dt-data-path', value.path)
    return node
  }
  static value(node) {
    return {
      src: node.getAttribute('src'),
      path: node.getAttribute('dt-data-path'),
    }
  }
  static formats(node) {
    return { 'dt-data-path': node.getAttribute('dt-data-path') }
  }
  format(name, value) {
    if (name === 'dt-data-path') {
      if (value) this.domNode.setAttribute('dt-data-path', value)
      else this.domNode.removeAttribute('dt-data-path')
    } else {
      super.format(name, value)
    }
  }
}
DtImageBlot.blotName = 'image'
DtImageBlot.tagName = 'img'
Quill.register(DtImageBlot, true)
import './RichTextEditor.css'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import { useTranslation } from 'react-i18next'

import { useDescriptionHtml } from '../../hooks/useDescriptionHtml'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import {
  pickImage,
  showUploadError,
  uploadChoreImage,
} from '../../utils/ChoreImageUpload'
import { patchDescriptionHtml } from '../../utils/ImageCache'

const RichTextEditor = forwardRef(
  (
    {
      draftId,
      entityId,
      entityType,
      isEditable = true,
      onChange,
      placeholder = null,
      value = '',
      variant = 'outlined',
    },
    ref,
  ) => {
    const { t } = useTranslation('chores')
    const { showError } = useNotification()
    const { data: userProfile } = useUserProfile()
    // Display-only HTML with expired image srcs swapped for cached/re-signed ones
    const displayHtml = useDescriptionHtml(value)
    const quillRef = useRef(null)
    const editorRef = useRef(null)
    const initialContentSet = useRef(false)

    // Expose focus method to parent components
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          if (editorRef.current) {
            editorRef.current.focus()
          }
        },
        blur: () => {
          if (editorRef.current) {
            editorRef.current.blur()
          }
        },
      }),
      [],
    )

    // Image upload handler - wrapped in useCallback to avoid recreating on every render
    const handleImageUpload = useCallback(() => {
      pickImage(async file => {
        try {
          const { path, status, url } = await uploadChoreImage(file, {
            entityId,
            entityType,
            draftId,
          })
          if (!path) {
            showUploadError(status, showError, t)
            return
          }
          // Insert image into Quill with dt-data-path tracked by the custom
          // blot, so the src can be re-signed after the URL expires.
          const quill = editorRef.current
          const range = quill.getSelection()
          const insertIndex = range ? range.index : 0
          quill.insertEmbed(insertIndex, 'image', { src: url, path })
        } catch (error) {
          console.error('Error during image processing or upload:', error)
          showError({
            title: t('common:upload.failedTitle'),
            message: t('common:upload.processingMessage'),
          })
        }
      })
    }, [entityId, entityType, draftId, showError, t]) // Dependencies for useCallback

    useEffect(() => {
      if (!quillRef.current) return
      if (!editorRef.current && isEditable) {
        editorRef.current = new Quill(quillRef.current, {
          theme: variant === 'bubble' ? 'bubble' : 'snow',
          modules: {
            toolbar: {
              container: [
                [{ header: [1, 2, 3, 4, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['link', 'image'],
                ['clean'],
              ],
              handlers: {
                image: handleImageUpload,
              },
            },
          },
          placeholder: placeholder ?? t('descriptionPlaceholder'),
        })
        new QuillMarkdown(editorRef.current, {})
        editorRef.current.root.innerHTML = value
        editorRef.current.on('text-change', () => {
          if (onChange) {
            onChange(editorRef.current.root.innerHTML)
          }
        })
      }
      // Keep Quill's editing state in sync with the isEditable prop
      if (editorRef.current) {
        editorRef.current.enable(isEditable)
      }
    }, [onChange, value, isEditable, variant, handleImageUpload, userProfile]) // Added handleImageUpload and userProfile to dependency array

    useEffect(() => {
      if (editorRef.current && isEditable) {
        if (editorRef.current.root.innerHTML !== value) {
          editorRef.current.root.innerHTML = value || ''
          // On first load, swap expired image srcs for cached/re-signed ones
          if (!initialContentSet.current && value) {
            patchDescriptionHtml(value).then(html => {
              if (editorRef.current && html !== value) {
                editorRef.current.root.innerHTML = html
              }
            })
          }
          initialContentSet.current = true
        }
      }
    }, [value, isEditable])

    if (!isEditable) {
      // Display-only mode: render HTML
      return (
        <div
          className='editor-view-mode'
          style={{
            minHeight: 120,
            overflow: 'scroll',
            //   border:
            //     '1px solid var(--joy-palette-neutral-outlinedBorder, #DDE7EE)',
            borderRadius: 8,
            padding: 16,
            background: 'var(--joy-palette-background-surface, #fff)',
            color: 'var(--joy-palette-text-primary, #1A2027)',
            fontFamily:
              'var(--joy-fontFamily-body, Inter, system-ui, Avenir, Helvetica, Arial, sans-serif)',
            fontSize: 16,
            boxShadow:
              'var(--joy-shadow-xs, 0px 1px 2px 0px rgba(16, 24, 40, 0.05))',
          }}
          dangerouslySetInnerHTML={{ __html: displayHtml }}
        />
      )
    }

    return (
      <div className={`quill-root quill-variant-${variant}`}>
        <div
          ref={quillRef}
          style={{
            minHeight: 120,
            background: 'var(--joy-palette-background-level1, #f0f4f8)',
          }}
        />
      </div>
    )
  },
)

RichTextEditor.displayName = 'RichTextEditor'

export default RichTextEditor

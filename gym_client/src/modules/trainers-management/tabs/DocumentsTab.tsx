import toast from 'react-hot-toast'
import { SectionCard } from '../components/SectionCard'
import { useTrainersModuleStore } from '../store'

export function TrainersDocumentsTab() {
  const trainers = useTrainersModuleStore((s) => s.trainers)
  const documents = useTrainersModuleStore((s) => s.documents)
  const addDocument = useTrainersModuleStore((s) => s.addDocument)

  async function onUpload(trainerId: string, file: File) {
    const reader = new FileReader()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.readAsDataURL(file)
    })
    addDocument({
      trainerId,
      fileName: file.name,
      mimeType: file.type,
      sizeKb: Math.ceil(file.size / 1024),
      fileDataUrl: dataUrl,
    })
    toast.success('Document uploaded.')
  }

  return (
    <SectionCard
      title="Trainer Documents"
      subtitle="Upload and store PDF/image documents by trainer ID."
    >
      <div className="grid gap-3">
        {trainers.map((trainer) => (
          <div key={trainer.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-white">{trainer.name}</p>
                <p className="text-xs text-slate-400">ID: {trainer.id}</p>
              </div>
              <label className="cursor-pointer rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/20">
                Upload PDF/Image
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    await onUpload(trainer.id, file)
                    event.target.value = ''
                  }}
                />
              </label>
            </div>
            <div className="space-y-1">
              {documents
                .filter((doc) => doc.trainerId === trainer.id)
                .map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{doc.fileName}</span>
                    <span className="text-slate-500">
                      {doc.sizeKb} KB • {new Date(doc.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              {documents.filter((doc) => doc.trainerId === trainer.id).length === 0 ? (
                <p className="text-xs text-slate-500">No files uploaded.</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

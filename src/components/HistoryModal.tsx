import React, { useState } from 'react';
import {
  History,
  Trash2,
  ExternalLink,
  Search,
  FileText,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  Calendar,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { GeneratedDoc, DocumentType } from '../types';
import { copyTextToClipboard } from '../utils/exportUtils';
import { formatDocumentCreationTime } from '../utils/dateFormat';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: GeneratedDoc[];
  onSelectDoc: (doc: GeneratedDoc) => void;
  onDeleteDoc: (id: string) => void;
  onClearHistory: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelectDoc,
  onDeleteDoc,
  onClearHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredHistory = history.filter((item) => {
    const matchesFilter = filterType === 'all' || item.type === filterType;
    const matchesSearch =
      searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.formDataSnapshot.namaMapel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.formDataSnapshot.materiPembelajaran.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.formDataSnapshot.namaSekolah.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleCopy = async (doc: GeneratedDoc) => {
    const ok = await copyTextToClipboard(doc.content);
    if (ok) {
      setCopiedId(doc.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const getTypeIcon = (type: DocumentType) => {
    switch (type) {
      case 'rppm':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'asesmen':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'lkpd':
        return <FileSpreadsheet className="w-4 h-4 text-purple-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  const getTypeLabel = (type: DocumentType) => {
    switch (type) {
      case 'rppm':
        return { label: 'RPPM', bg: 'bg-blue-100 text-blue-800' };
      case 'asesmen':
        return { label: 'Asesmen & Rubrik', bg: 'bg-emerald-100 text-emerald-800' };
      case 'lkpd':
        return { label: 'LKPD', bg: 'bg-purple-100 text-purple-800' };
      default:
        return { label: 'Dokumen', bg: 'bg-slate-100 text-slate-800' };
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold">Histori Penyimpanan Dokumen</h3>
              <p className="text-xs text-slate-400">
                Tersimpan otomatis di penyimpanan lokal ({history.length} dokumen tersimpan)
              </p>
            </div>
          </div>
          <button
            id="btn-close-history"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Filter & Search */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari mata pelajaran, materi, sekolah..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-800"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {['all', 'rppm', 'asesmen', 'lkpd'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  filterType === type
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {type === 'all'
                  ? 'Semua'
                  : type === 'rppm'
                  ? 'RPPM'
                  : type === 'asesmen'
                  ? 'Asesmen'
                  : 'LKPD'}
              </button>
            ))}
          </div>
        </div>

        {/* List of Documents */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 bg-slate-50/50">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <History className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-medium">Belum ada riwayat dokumen yang cocok.</p>
              <p className="text-[11px] text-slate-400">
                Dokumen yang Anda buat akan otomatis disimpan di sini.
              </p>
            </div>
          ) : (
            filteredHistory.map((doc) => {
              const badge = getTypeLabel(doc.type);
              return (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-sky-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs font-bold text-slate-800 line-clamp-1">
                        {doc.title}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                      <span>{doc.formDataSnapshot.namaMapel} • {doc.formDataSnapshot.faseKelas}</span>
                      <span>• {doc.formDataSnapshot.namaSekolah || 'Sekolah'}</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3" />
                        {formatDocumentCreationTime(doc.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleCopy(doc)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs"
                      title="Salin isi dokumen"
                    >
                      {copiedId === doc.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectDoc(doc);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteDoc(doc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus dari histori"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
          {history.length > 0 ? (
            <button
              id="btn-clear-all-history"
              type="button"
              onClick={onClearHistory}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan Semua Histori</span>
            </button>
          ) : (
            <div></div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

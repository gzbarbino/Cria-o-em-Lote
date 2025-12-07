import React, { useState, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { parseCSV, extractKeysFromPPTX, generateBatch } from './utils/pptxProcessor';
import { CsvRow, PreviewData, ProcessingStats, ColumnMapping } from './types';
import { FileText, Database, ArrowRight, Download, RefreshCw, AlertCircle, Loader2, Info, GripHorizontal, X, Sparkles } from 'lucide-react';

const App: React.FC = () => {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  
  const [stats, setStats] = useState<ProcessingStats>({
    total: 0,
    processed: 0,
    isProcessing: false,
    isComplete: false,
  });

  const [error, setError] = useState<string | null>(null);

  // Analyze files when both are uploaded
  useEffect(() => {
    const analyzeFiles = async () => {
      if (!templateFile || !csvFile) {
        setPreviewData(null);
        setMapping({});
        return;
      }

      try {
        setError(null);
        // 1. Parse CSV
        const data = await parseCSV(csvFile);
        if (data.length === 0) {
          throw new Error("O arquivo CSV está vazio.");
        }
        setCsvData(data);
        const headers = Object.keys(data[0]);

        // 2. Parse Template Keys
        const templateKeys = await extractKeysFromPPTX(templateFile);

        setPreviewData({
          csvHeaders: headers,
          templateKeys: templateKeys,
          rowCount: data.length
        });

        // 3. Auto-match columns to keys
        const newMapping: ColumnMapping = {};
        templateKeys.forEach(key => {
          // Find header that loosely matches key (case insensitive)
          const matchedHeader = headers.find(h => h.trim().toLowerCase() === key.toLowerCase());
          newMapping[key] = matchedHeader || null;
        });
        setMapping(newMapping);

      } catch (err) {
        console.error(err);
        setError("Erro ao analisar arquivos. Verifique se o CSV é válido e o PPTX não está corrompido.");
      }
    };

    analyzeFiles();
  }, [templateFile, csvFile]);

  const handleGenerate = async () => {
    if (!templateFile || csvData.length === 0) return;

    // Validate that at least one field is mapped
    const hasMappings = Object.values(mapping).some(v => v !== null);
    if (!hasMappings) {
      if (!confirm("Nenhuma coluna foi mapeada para os campos do slide. Os arquivos serão gerados sem substituições. Deseja continuar?")) {
        return;
      }
    }

    setStats({
      total: csvData.length,
      processed: 0,
      isProcessing: true,
      isComplete: false
    });

    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    try {
      const zipBlob = await generateBatch(templateFile, csvData, mapping, (current, total) => {
        setStats(prev => ({ ...prev, processed: current, total }));
      });
      
      const url = URL.createObjectURL(zipBlob);
      setDownloadUrl(url);
      setStats(prev => ({ ...prev, isProcessing: false, isComplete: true }));

    } catch (err) {
      console.error(err);
      setError("Ocorreu um erro durante a geração dos arquivos.");
      setStats(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleReset = () => {
    setTemplateFile(null);
    setCsvFile(null);
    setCsvData([]);
    setPreviewData(null);
    setMapping({});
    setStats({ total: 0, processed: 0, isProcessing: false, isComplete: false });
    setError(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, colName: string) => {
    e.dataTransfer.setData("text/plain", colName);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent, templateKey: string) => {
    e.preventDefault();
    const colName = e.dataTransfer.getData("text/plain");
    if (colName) {
      setMapping(prev => ({ ...prev, [templateKey]: colName }));
    }
  };

  const handleRemoveMapping = (templateKey: string) => {
    setMapping(prev => ({ ...prev, [templateKey]: null }));
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-700">
      
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-2 rounded-lg shadow-sm">
              <Sparkles size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              PostGen <span className="text-indigo-600">Batch</span>
            </h1>
          </div>
          <a href="#" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors hidden sm:block">
            Como funciona?
          </a>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
            Crie milhares de posts <br className="hidden sm:block"/> em segundos.
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed mb-8">
            Automatize sua produção de conteúdo. Faça upload do seu template <span className="font-semibold text-orange-600 bg-orange-50 px-1 rounded">.pptx</span> e seus dados <span className="font-semibold text-emerald-600 bg-emerald-50 px-1 rounded">.csv</span> que nós geramos os arquivos para você.
          </p>
        </div>

        {/* Upload Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <FileUploader 
            label="Template PowerPoint" 
            accept=".pptx"
            extensionLabel=".pptx"
            file={templateFile}
            onFileSelect={setTemplateFile}
            icon={<FileText size={32} />}
          />
          <FileUploader 
            label="Dados do Conteúdo" 
            accept=".csv"
            extensionLabel=".csv"
            file={csvFile}
            onFileSelect={setCsvFile}
            icon={<Database size={32} />}
          />
        </div>

        {/* Error Notification */}
        {error && (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700 shadow-sm">
              <AlertCircle size={20} className="shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Workspace: Mapping & Processing */}
        {previewData && !stats.isProcessing && !stats.isComplete && (
          <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden animate-slide-up">
            
            {/* Header of Workspace */}
            <div className="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <RefreshCw size={20} className="text-indigo-600" /> 
                  Mapeamento de Dados
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Arraste as colunas do CSV para os campos correspondentes no template.
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                {previewData.rowCount} linhas detectadas
              </span>
            </div>
            
            <div className="p-8 grid md:grid-cols-12 gap-10">
              
              {/* Left Column: Draggable Items */}
              <div className="md:col-span-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Colunas do CSV</h4>
                </div>
                <div className="flex flex-col gap-2.5 p-3 bg-slate-50/80 rounded-xl min-h-[250px] border border-slate-200/60 inner-shadow">
                  {previewData.csvHeaders.map(header => (
                    <div
                      key={header}
                      draggable
                      onDragStart={(e) => handleDragStart(e, header)}
                      className="bg-white px-4 py-3 rounded-lg border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-md hover:text-indigo-700 transition-all flex items-center justify-between group"
                    >
                      <span className="text-sm font-medium truncate">{header}</span>
                      <GripHorizontal size={16} className="text-slate-300 group-hover:text-indigo-300" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Center Divider/Arrow */}
              <div className="hidden md:flex md:col-span-1 flex-col items-center justify-center space-y-2 opacity-30">
                <div className="w-px h-full bg-slate-300"></div>
                <ArrowRight size={24} className="text-slate-400" />
                <div className="w-px h-full bg-slate-300"></div>
              </div>

              {/* Right Column: Drop Zones */}
              <div className="md:col-span-7 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Campos no Slide</h4>
                {previewData.templateKeys.length === 0 ? (
                  <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 flex flex-col items-center justify-center">
                    <Info size={32} className="mb-2 opacity-50" />
                    <p>Nenhum campo {'{{CHAVE}}'} encontrado no slide 1.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {previewData.templateKeys.map(key => {
                      const mappedCol = mapping[key];
                      return (
                        <div 
                          key={key} 
                          className="flex items-center gap-4 group"
                        >
                          {/* Label */}
                          <div className="w-1/3 shrink-0 text-right">
                             <div className="inline-block relative">
                                <span className="font-mono text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 block truncate max-w-[140px]" title={key}>
                                  {'{'}{'{'}{key}{'}'}{'}'}
                                </span>
                             </div>
                          </div>

                          {/* Connection Line */}
                          <div className={`h-px w-6 shrink-0 transition-colors ${mappedCol ? 'bg-indigo-300' : 'bg-slate-200'}`}></div>

                          {/* Drop Zone */}
                          <div
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, key)}
                            className={`
                              flex-1 h-12 rounded-xl border-2 border-dashed flex items-center justify-center transition-all relative overflow-hidden
                              ${mappedCol 
                                ? 'border-emerald-400 bg-emerald-50' 
                                : 'border-slate-200 bg-slate-50 hover:border-indigo-400 hover:bg-white'}
                            `}
                          >
                            {mappedCol ? (
                              <div className="flex items-center gap-2 px-4 w-full justify-between animate-fade-in">
                                <span className="text-sm font-bold text-emerald-800 truncate flex items-center gap-2">
                                  <Database size={14} className="opacity-50" />
                                  {mappedCol}
                                </span>
                                <button 
                                  onClick={() => handleRemoveMapping(key)}
                                  className="text-emerald-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                                  title="Remover mapeamento"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-medium text-slate-400 pointer-events-none">Arraste a coluna aqui</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 flex justify-end items-center border-t border-slate-100 gap-4">
               <span className="text-sm text-slate-500">Tudo pronto?</span>
              <button
                onClick={handleGenerate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center gap-2 transform active:scale-95"
              >
                Gerar {previewData.rowCount} Arquivos
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Processing Loader */}
        {stats.isProcessing && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl p-12 text-center animate-fade-in">
            <div className="relative w-20 h-20 mx-auto mb-6">
               <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
               <div className="relative w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
                 <Loader2 size={40} className="text-indigo-600 animate-spin" />
               </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Gerando seus arquivos...</h3>
            <p className="text-slate-500 mb-8 font-medium">Processando item {stats.processed} de {stats.total}</p>
            
            <div className="w-full max-w-sm mx-auto bg-slate-100 rounded-full h-3 mb-2 overflow-hidden border border-slate-200">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${(stats.processed / stats.total) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-400 mt-4">Isso pode levar alguns segundos dependendo do tamanho do template.</p>
          </div>
        )}

        {/* Success & Download */}
        {stats.isComplete && downloadUrl && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-emerald-100 shadow-2xl shadow-emerald-100/50 p-10 animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
            
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-emerald-100">
                <Download size={40} className="text-emerald-600" />
              </div>
              <h3 className="text-3xl font-extrabold text-slate-900 mb-3">Sucesso!</h3>
              <p className="text-slate-600 text-lg">
                Seu lote de <span className="font-bold text-slate-900">{stats.total} arquivos</span> está pronto para download.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8 flex gap-4 text-left">
              <div className="shrink-0 pt-1">
                <Info size={22} className="text-blue-600" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-blue-900 text-sm">Como converter para Imagens (PNG/JPG)?</p>
                <p className="text-blue-800 text-sm leading-relaxed">
                  1. Abra o arquivo gerado no PowerPoint.<br/>
                  2. Vá em <strong>Arquivo {'>'} Salvar Como</strong>.<br/>
                  3. Escolha o formato <strong>JPEG</strong> ou <strong>PNG</strong>.<br/>
                  4. Selecione a opção <strong>"Todos os Slides"</strong>.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href={downloadUrl}
                download="lote_gerado.zip"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
              >
                <Download size={22} />
                Baixar Arquivos (.zip)
              </a>
              
              <button 
                onClick={handleReset}
                className="w-full sm:w-auto text-slate-500 hover:text-slate-800 px-6 py-4 font-medium flex items-center justify-center gap-2 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <RefreshCw size={18} />
                Criar Novo Lote
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-8 text-center border-t border-slate-200 mt-12">
        <p className="text-slate-400 text-sm">
          Ferramenta segura. Todo o processamento é feito no seu navegador.
        </p>
      </footer>

    </div>
  );
};

export default App;
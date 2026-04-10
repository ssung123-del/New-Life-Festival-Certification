import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, Image as ImageIcon, Loader2, X, Plus, FileImage } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{name: string}[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 연락처 자동 하이픈 포맷팅
  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length > 3 && val.length <= 7) {
      val = val.replace(/(\d{3})(\d+)/, '$1-$2');
    } else if (val.length > 7) {
      val = val.replace(/(\d{3})(\d{4})(\d+)/, '$1-$2-$3');
    }
    setContact(val.slice(0, 13));
  };

  const processFiles = (selectedFiles: FileList | File[]) => {
    const newFiles = Array.from(selectedFiles).filter(file => file.type.startsWith('image/'));
    if (newFiles.length === 0) return;

    setFiles(prev => [...prev, ...newFiles]);
    
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !contact || files.length === 0) {
      setErrorMessage('이름, 연락처, 사진을 모두 입력해주세요.');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setUploadProgress(0);
    setErrorMessage('');
    
    const results: {name: string}[] = [];
    const cleanContact = contact.replace(/-/g, ''); // 하이픈 제거 후 전송

    try {
      // 순차적으로 업로드하여 정확한 진행률(게이지) 표시
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('contact', cleanContact);
        formData.append('photo', files[i]);

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/upload');
          
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const fileProgress = event.loaded / event.total;
              // 전체 진행률 계산 (현재 파일 인덱스 + 현재 파일 진행률) / 전체 파일 수
              const overallProgress = ((i + fileProgress) / files.length) * 100;
              // 서버 응답 대기 시간을 위해 95%까지만 올리고, 완료 시 100%로 설정
              setUploadProgress(Math.min(overallProgress, ((i + 1) / files.length) * 100 - 2));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const res = JSON.parse(xhr.responseText);
                if (res.success) {
                  results.push({ name: res.fileName });
                  setUploadProgress(((i + 1) / files.length) * 100);
                  resolve(res);
                } else {
                  reject(new Error(res.error || '업로드 실패'));
                }
              } catch(e) {
                reject(new Error('서버 응답을 처리할 수 없습니다.'));
              }
            } else {
              reject(new Error('서버와 통신 중 오류가 발생했습니다.'));
            }
          };
          
          xhr.onerror = () => reject(new Error('네트워크 오류가 발생했습니다.'));
          xhr.send(formData);
        });
      }

      setUploadedFiles(results);
      setStatus('success');
    } catch (error: any) {
      console.error('Upload error:', error);
      setErrorMessage(error.message || '서버와 통신 중 오류가 발생했습니다.');
      setStatus('error');
    }
  };

  const resetForm = () => {
    setName('');
    setContact('');
    setFiles([]);
    setPreviews([]);
    setStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
    setUploadedFiles([]);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans">
      {/* Left/Top Section - Hero (PC에서는 왼쪽 고정, 모바일에서는 상단) */}
      <div className="md:w-5/12 lg:w-1/2 bg-emerald-900 text-white p-8 md:p-12 lg:p-20 flex flex-col justify-center relative overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-100 via-transparent to-transparent"></div>
        <div className="relative z-10 max-w-xl mx-auto md:mx-0 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl mb-6 leading-tight tracking-tight">
              새생명축제<br/>
              <span className="text-emerald-300">참석자 인증</span>
            </h1>
            <p className="text-emerald-100/80 text-lg md:text-xl font-light leading-relaxed mb-8">
              성도님의 소중한 발걸음을 기록합니다.<br className="hidden md:block" />
              이름과 연락처를 입력하고<br className="hidden md:block" />
              인증 사진을 업로드해주세요.
            </p>
            <div className="hidden md:flex items-center gap-4 text-emerald-200/60 text-sm">
              <div className="w-12 h-[1px] bg-emerald-200/30"></div>
              <p>안전하게 관리자의 드라이브에 보관됩니다</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right/Bottom Section - Form */}
      <div className="md:w-7/12 lg:w-1/2 p-6 md:p-12 lg:p-20 flex items-center justify-center bg-gray-50/50 flex-1">
        <div className="w-full max-w-md mx-auto">
          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8 text-center"
              >
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="font-serif text-3xl text-emerald-900 mb-3">인증 완료!</h2>
                <p className="text-gray-500 mb-8">
                  <strong className="text-gray-800">{name}</strong> 성도님의 인증 사진이<br/>성공적으로 제출되었습니다.
                </p>
                
                {/* 업로드된 파일 목록 표시 */}
                <div className="bg-gray-50 rounded-2xl p-4 mb-8 text-left">
                  <p className="text-sm font-medium text-gray-700 mb-3 px-1">업로드된 파일 ({uploadedFiles.length}개)</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {uploadedFiles.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                        <FileImage className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span className="text-sm text-gray-600 truncate">{f.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={resetForm}
                  className="w-full bg-emerald-800 hover:bg-emerald-900 text-white rounded-2xl py-4 font-medium transition-colors"
                >
                  다른 분 인증하기
                </button>
              </motion.div>
            ) : (
              <motion.form 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6"
              >
                {/* Name Input */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2 px-1">
                    이름
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all"
                    disabled={status === 'uploading'}
                  />
                </div>

                {/* Contact Input */}
                <div>
                  <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-2 px-1">
                    연락처
                  </label>
                  <input
                    type="tel"
                    id="contact"
                    value={contact}
                    onChange={handleContactChange}
                    placeholder="010-1234-5678"
                    maxLength={13}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all"
                    disabled={status === 'uploading'}
                  />
                </div>

                {/* Photo Upload */}
                <div>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <label className="block text-sm font-medium text-gray-700">
                      인증 사진
                    </label>
                    <span className="text-xs text-gray-400">여러 장 선택 가능</span>
                  </div>
                  
                  <div 
                    className={`relative border-2 border-dashed rounded-3xl overflow-hidden transition-colors ${
                      files.length > 0 ? 'border-gray-100 bg-white p-4' : 'border-gray-200 hover:border-emerald-300 bg-gray-50'
                    }`}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={status === 'uploading'}
                    />
                    
                    {files.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {previews.map((preview, idx) => (
                          <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm border border-gray-100">
                            <img src={preview} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeFile(idx)}
                              disabled={status === 'uploading'}
                              className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all disabled:opacity-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {/* Add more button */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={status === 'uploading'}
                          className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 hover:border-emerald-300 flex flex-col items-center justify-center text-gray-400 hover:text-emerald-500 transition-colors bg-gray-50 hover:bg-emerald-50/30"
                        >
                          <Plus className="w-6 h-6 mb-1" />
                          <span className="text-xs font-medium">사진 추가</span>
                        </button>
                      </div>
                    ) : (
                      <div 
                        className="py-12 px-6 text-center cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4 text-emerald-600 border border-emerald-50">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <p className="text-gray-700 font-medium mb-1">사진을 선택하거나 끌어다 놓으세요</p>
                        <p className="text-gray-400 text-sm">여러 장의 이미지를 올릴 수 있습니다</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Error Message */}
                {status === 'error' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-start gap-3 text-sm border border-red-100"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>{errorMessage}</p>
                  </motion.div>
                )}

                {/* Progress Bar & Submit Button */}
                <div className="pt-2">
                  {status === 'uploading' ? (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-medium text-emerald-800 px-1">
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> 업로드 진행 중...
                        </span>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <motion.div 
                          className="bg-emerald-600 h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={!name || !contact || files.length === 0}
                      className="w-full bg-emerald-800 hover:bg-emerald-900 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-2xl py-4 font-medium transition-all shadow-sm hover:shadow-md disabled:shadow-none"
                    >
                      인증 사진 제출하기
                    </button>
                  )}
                </div>
              </motion.form>
            )}
          </AnimatePresence>
          
          <p className="text-center text-gray-400 text-sm mt-8 md:hidden">
            제출된 사진은 관리자의 드라이브에 안전하게 보관됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

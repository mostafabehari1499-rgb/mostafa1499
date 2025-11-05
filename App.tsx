
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { Prompt, PromptSettings, FontStyle, Alignment, Mode, Direction } from './types';
import {
  PlayIcon, PauseIcon, PlusIcon, MinusIcon, SunIcon, MoonIcon,
  AlignLeftIcon, AlignCenterIcon, AlignRightIcon, FullscreenIcon, HomeIcon,
  HistoryIcon, EditIcon, StopIcon, TrashIcon, BackIcon, SearchIcon,
} from './components/icons';

const DEFAULT_SETTINGS: PromptSettings = {
  speed: 2,
  fontSize: 6,
  fontStyle: 'font-inter',
  alignment: 'center',
  mode: 'night',
  direction: 'ltr',
};

const createNewPrompt = (settings = DEFAULT_SETTINGS): Prompt => ({
  id: Date.now().toString(),
  title: 'Untitled Prompt',
  text: 'Welcome to ProPrompter AI! Paste your script here. \n\nYou can **highlight** important text by wrapping it in double asterisks. \n\nAdd a [bookmark] to jump to specific sections.',
  settings: { ...settings },
  createdAt: Date.now(),
});

// Helper function to parse text for highlights and bookmarks
const parseText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|\[.*?\])/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="text-yellow-400">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('[') && part.endsWith(']')) {
      const bookmarkName = part.slice(1, -1);
      return <span key={index} id={`bookmark-${bookmarkName.replace(/\s+/g, '-')}`} className="relative block text-center my-4 text-cyan-400 opacity-50 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-full before:h-px before:bg-cyan-400 before:opacity-50">
        - {bookmarkName} -
      </span>;
    }
    return <span key={index}>{part}</span>;
  });
};


// Teleprompter View Component
interface TeleprompterViewProps {
  prompt: Prompt;
  onFinish: (finishedPrompt: Prompt) => void;
  onBack: () => void;
}
const TeleprompterView: React.FC<TeleprompterViewProps> = ({ prompt: initialPrompt, onFinish, onBack }) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollPos, setScrollPos] = useState(0);
  const [startTime, setStartTime] = useState<number | undefined>(undefined);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  const { settings } = prompt;
  const { speed, fontSize, fontStyle, alignment, mode, direction } = settings;

  const updateSetting = <K extends keyof PromptSettings,>(key: K, value: PromptSettings[K]) => {
    setPrompt(p => ({ ...p, settings: { ...p.settings, [key]: value } }));
  };

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
    if (!startTime) {
        setStartTime(Date.now());
    }
  };

  const handleFinish = () => {
    setIsPlaying(false);
    const finishedPrompt = { ...prompt, startTime, endTime: Date.now() };
    onFinish(finishedPrompt);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const scroll = useCallback(() => {
    if (containerRef.current && contentRef.current) {
      if (scrollPos < contentRef.current.offsetHeight) {
        setScrollPos(prev => prev + speed / 10);
      } else {
        setIsPlaying(false);
      }
    }
    animationFrameRef.current = requestAnimationFrame(scroll);
  }, [scrollPos, speed]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(scroll);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, scroll]);
  
  useEffect(() => {
      if (containerRef.current) {
          containerRef.current.scrollTop = scrollPos;
      }
  }, [scrollPos]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      switch (e.code) {
        case 'Space':
          togglePlay();
          break;
        case 'ArrowUp':
          updateSetting('speed', Math.min(10, speed + 0.5));
          break;
        case 'ArrowDown':
          updateSetting('speed', Math.max(0, speed - 0.5));
          break;
        case 'ArrowRight':
          updateSetting('fontSize', Math.min(20, fontSize + 0.5));
          break;
        case 'ArrowLeft':
          updateSetting('fontSize', Math.max(1, fontSize - 0.5));
          break;
        case 'Escape':
          onBack();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [speed, fontSize, onBack]);

  const alignmentClasses = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right',
  };

  const directionClass = direction === 'rtl' ? 'rtl' : 'ltr';

  return (
    <div className={`fixed inset-0 flex flex-col ${mode === 'night' ? 'bg-black text-white' : 'bg-white text-black'} ${fontStyle}`}>
      <div ref={containerRef} className="flex-grow overflow-hidden relative">
        <div className={`absolute top-0 left-0 right-0 flex flex-col p-8 transition-all duration-300 ${alignmentClasses[alignment]}`} style={{ transform: `translateY(-${scrollPos}px)` }}>
            <div ref={contentRef} style={{ fontSize: `${fontSize}rem`, lineHeight: 1.5 }} className={`max-w-full whitespace-pre-wrap`} dir={directionClass}>
                <div style={{ paddingTop: '50vh', paddingBottom: '50vh' }}>
                    {useMemo(() => parseText(prompt.text), [prompt.text])}
                </div>
            </div>
        </div>
        <div className="absolute top-1/2 left-0 w-full border-t-2 border-red-500 opacity-50 -translate-y-1/2"></div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-30 text-white p-4 flex items-center justify-center gap-4 flex-wrap">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700 transition" title="Back to Editor"><BackIcon /></button>
        <button onClick={togglePlay} className="p-3 bg-blue-600 rounded-full hover:bg-blue-700 transition text-white" title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button onClick={handleFinish} className="p-3 bg-red-600 rounded-full hover:bg-red-700 transition text-white" title="Stop and Save"><StopIcon /></button>
        
        <div className="flex items-center gap-2">
            <span>Speed</span>
            <button onClick={() => updateSetting('speed', Math.max(0, speed - 0.5))} className="p-2 rounded-full hover:bg-gray-700 transition"><MinusIcon /></button>
            <input type="range" min="0" max="10" step="0.1" value={speed} onChange={e => updateSetting('speed', parseFloat(e.target.value))} className="w-24"/>
            <button onClick={() => updateSetting('speed', Math.min(10, speed + 0.5))} className="p-2 rounded-full hover:bg-gray-700 transition"><PlusIcon /></button>
        </div>

        <div className="flex items-center gap-2">
            <span>Font Size</span>
            <button onClick={() => updateSetting('fontSize', Math.max(1, fontSize - 0.5))} className="p-2 rounded-full hover:bg-gray-700 transition"><MinusIcon /></button>
            <input type="range" min="1" max="20" step="0.5" value={fontSize} onChange={e => updateSetting('fontSize', parseFloat(e.target.value))} className="w-24"/>
            <button onClick={() => updateSetting('fontSize', Math.min(20, fontSize + 0.5))} className="p-2 rounded-full hover:bg-gray-700 transition"><PlusIcon /></button>
        </div>

        <div className="flex items-center gap-1 p-1 bg-gray-800 rounded-full">
            <button onClick={() => updateSetting('alignment', 'left')} className={`p-2 rounded-full transition ${alignment === 'left' ? 'bg-blue-600' : ''}`} title="Align Left"><AlignLeftIcon /></button>
            <button onClick={() => updateSetting('alignment', 'center')} className={`p-2 rounded-full transition ${alignment === 'center' ? 'bg-blue-600' : ''}`} title="Align Center"><AlignCenterIcon /></button>
            <button onClick={() => updateSetting('alignment', 'right')} className={`p-2 rounded-full transition ${alignment === 'right' ? 'bg-blue-600' : ''}`} title="Align Right"><AlignRightIcon /></button>
        </div>

        <select value={fontStyle} onChange={e => updateSetting('fontStyle', e.target.value as FontStyle)} className="bg-gray-800 p-2 rounded-md">
            <option value="font-inter">Sans Serif (Inter)</option>
            <option value="font-lora">Serif (Lora)</option>
            <option value="font-roboto-mono">Monospace (Roboto)</option>
        </select>

        <button onClick={() => updateSetting('mode', mode === 'night' ? 'day' : 'night')} className="p-2 rounded-full hover:bg-gray-700 transition" title={mode === 'night' ? 'Day Mode' : 'Night Mode'}>
            {mode === 'night' ? <SunIcon /> : <MoonIcon />}
        </button>

        <button onClick={handleFinish} className="p-2 rounded-full hover:bg-gray-700 transition" title="Finish & Return Home"><HomeIcon /></button>
        <button onClick={toggleFullScreen} className="p-2 rounded-full hover:bg-gray-700 transition" title="Toggle Fullscreen"><FullscreenIcon /></button>
      </div>
    </div>
  );
};


// Editor View Component
interface EditorViewProps {
    prompt: Prompt;
    onPromptChange: (prompt: Prompt) => void;
    onStart: () => void;
    onViewHistory: () => void;
}
const EditorView: React.FC<EditorViewProps> = ({ prompt, onPromptChange, onStart, onViewHistory }) => {
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onPromptChange({ ...prompt, text: e.target.value });
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onPromptChange({ ...prompt, title: e.target.value });
    };

    const handleDirectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onPromptChange({ ...prompt, settings: { ...prompt.settings, direction: e.target.value as Direction } });
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">ProPrompter AI</h1>
                    <div className="flex items-center gap-4">
                        <button onClick={onViewHistory} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition">
                            <HistoryIcon />
                            <span>History</span>
                        </button>
                         <button onClick={onStart} className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition">
                            <PlayIcon />
                            <span>Start Prompting</span>
                        </button>
                    </div>
                </header>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <div className="mb-4">
                        <label htmlFor="prompt-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prompt Title</label>
                        <input
                            id="prompt-title"
                            type="text"
                            value={prompt.title}
                            onChange={handleTitleChange}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label htmlFor="prompt-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Script</label>
                            <select value={prompt.settings.direction} onChange={handleDirectionChange} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm px-2 py-1">
                                <option value="ltr">Left-to-Right (LTR)</option>
                                <option value="rtl">Right-to-Left (RTL)</option>
                            </select>
                        </div>
                        <textarea
                            id="prompt-text"
                            value={prompt.text}
                            onChange={handleTextChange}
                            className={`mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm min-h-[50vh] ${prompt.settings.direction === 'rtl' ? 'rtl text-right' : 'ltr'}`}
                            rows={20}
                            placeholder="Paste your script here..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};


// History View Component
interface HistoryViewProps {
    prompts: Prompt[];
    onLoadPrompt: (prompt: Prompt) => void;
    onDeletePrompt: (id: string) => void;
    onBack: () => void;
}
const HistoryView: React.FC<HistoryViewProps> = ({ prompts, onLoadPrompt, onDeletePrompt, onBack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortKey, setSortKey] = useState<'createdAt' | 'title'>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const filteredAndSortedPrompts = useMemo(() => {
        return prompts
            .filter(p =>
                p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.text.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => {
                let comparison = 0;
                if (a[sortKey] > b[sortKey]) {
                    comparison = 1;
                } else if (a[sortKey] < b[sortKey]) {
                    comparison = -1;
                }
                return sortOrder === 'desc' ? -comparison : comparison;
            });
    }, [prompts, searchTerm, sortKey, sortOrder]);

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"><BackIcon /></button>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Prompt History</h1>
                    </div>
                </header>

                <div className="mb-4 flex gap-4">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Search by title or keyword..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon />
                        </div>
                    </div>
                    <select onChange={e => setSortKey(e.target.value as 'createdAt' | 'title')} value={sortKey} className="border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 px-2">
                        <option value="createdAt">Sort by Date</option>
                        <option value="title">Sort by Title</option>
                    </select>
                    <select onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')} value={sortOrder} className="border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 px-2">
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                    </select>
                </div>

                <div className="space-y-4">
                    {filteredAndSortedPrompts.map(p => (
                        <div key={p.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg">{p.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {new Date(p.createdAt).toLocaleString()}
                                    {p.startTime && p.endTime && ` | Duration: ${Math.round((p.endTime - p.startTime)/1000)}s`}
                                </p>
                                <p className="text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">{p.text}</p>
                            </div>
                            <div className="flex gap-2 shrink-0 ml-4">
                                <button onClick={() => onLoadPrompt(p)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition" title="Load Prompt"><EditIcon /></button>
                                <button onClick={() => onDeletePrompt(p.id)} className="p-2 text-red-500 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition" title="Delete Prompt"><TrashIcon /></button>
                            </div>
                        </div>
                    ))}
                    {filteredAndSortedPrompts.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            <p>No prompts found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// Main App Component
const App: React.FC = () => {
    type View = 'editor' | 'teleprompter' | 'history';
    
    const [view, setView] = useState<View>('editor');
    const [promptsHistory, setPromptsHistory] = useLocalStorage<Prompt[]>('promptsHistory', []);
    const [activePrompt, setActivePrompt] = useState<Prompt>(createNewPrompt());

    const handleStart = () => {
        // Create a fresh copy to not mutate the one in the editor until it's finished
        setActivePrompt(p => ({ ...p, id: Date.now().toString(), createdAt: Date.now() }));
        setView('teleprompter');
    };

    const handleFinishPrompt = (finishedPrompt: Prompt) => {
        setPromptsHistory(prev => [finishedPrompt, ...prev]);
        setView('editor');
    };

    const handleLoadPrompt = (promptToLoad: Prompt) => {
        setActivePrompt(createNewPrompt(promptToLoad.settings));
        // Use a timeout to ensure state update before changing text/title
        setTimeout(() => {
            setActivePrompt(p => ({ ...p, text: promptToLoad.text, title: promptToLoad.title }));
        }, 0);
        setView('editor');
    };
    
    const handleDeletePrompt = (id: string) => {
        if(window.confirm("Are you sure you want to delete this prompt?")) {
            setPromptsHistory(prev => prev.filter(p => p.id !== id));
        }
    };

    const handleBackToEditor = () => {
        if(window.confirm("Are you sure you want to exit? Your current session won't be saved.")) {
            setView('editor');
        }
    };
    
    if (view === 'teleprompter') {
        return <TeleprompterView prompt={activePrompt} onFinish={handleFinishPrompt} onBack={handleBackToEditor} />;
    }
    
    if (view === 'history') {
        return <HistoryView prompts={promptsHistory} onLoadPrompt={handleLoadPrompt} onDeletePrompt={handleDeletePrompt} onBack={() => setView('editor')} />;
    }

    return <EditorView prompt={activePrompt} onPromptChange={setActivePrompt} onStart={handleStart} onViewHistory={() => setView('history')} />;
}

export default App;

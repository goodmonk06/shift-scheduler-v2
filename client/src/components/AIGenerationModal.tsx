/**
 * AI生成風の全画面モーダルコンポーネント
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, Calendar, Users, Clock, CheckCircle } from 'lucide-react';

interface AIGenerationModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const AIGenerationModal: React.FC<AIGenerationModalProps> = ({ isOpen, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { icon: Calendar, text: '希望休・希望勤務を分析中...', duration: 4000 },
    { icon: Users, text: '職員の固定勤務時間を確認中...', duration: 4000 },
    { icon: Clock, text: '職場ルールを適用中...', duration: 4000 },
    { icon: Brain, text: '最適なシフトを生成中...', duration: 4000 },
    { icon: Sparkles, text: '最終調整を行っています...', duration: 4000 },
    { icon: CheckCircle, text: '完了！', duration: 500 },
  ];

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setCurrentStep(0);
      return;
    }

    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
    const interval = 100;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      const newProgress = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(newProgress);

      // 現在のステップを計算
      let stepElapsed = elapsed;
      for (let i = 0; i < steps.length; i++) {
        if (stepElapsed <= steps[i].duration) {
          setCurrentStep(i);
          break;
        }
        stepElapsed -= steps[i].duration;
      }

      if (elapsed >= totalDuration) {
        clearInterval(timer);
        setTimeout(onComplete, 500);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen, onComplete]);

  const CurrentIcon = steps[currentStep]?.icon || Calendar;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 z-50 flex items-center justify-center"
        >
          {/* 背景のパーティクルエフェクト */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white/20 rounded-full"
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: window.innerHeight + 50,
                }}
                animate={{
                  y: -50,
                  x: Math.random() * window.innerWidth,
                }}
                transition={{
                  duration: Math.random() * 10 + 10,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 max-w-2xl w-full mx-auto px-8">
            {/* メインコンテンツ */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 shadow-2xl"
            >
              {/* アイコン */}
              <motion.div
                className="mx-auto w-32 h-32 mb-8 relative"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-2xl opacity-50" />
                <div className="relative bg-white/20 backdrop-blur-sm rounded-full w-full h-full flex items-center justify-center">
                  <CurrentIcon className="w-16 h-16 text-white" />
                </div>
              </motion.div>

              {/* タイトル */}
              <h2 className="text-3xl font-bold text-white text-center mb-2">
                AIがシフトを生成中
              </h2>

              {/* 現在のステップ */}
              <motion.p
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-white/80 text-center mb-8 text-lg"
              >
                {steps[currentStep]?.text}
              </motion.p>

              {/* プログレスバー */}
              <div className="relative mb-4">
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-400 to-pink-400"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-white/60 text-sm">進捗</span>
                  <span className="text-white font-bold">{Math.round(progress)}%</span>
                </div>
              </div>

              {/* ステップインジケーター */}
              <div className="flex justify-center space-x-2 mt-8">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index <= currentStep
                        ? 'bg-white w-8'
                        : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </motion.div>

            {/* 補足テキスト */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-white/60 text-center mt-8 text-sm"
            >
              最適なシフト配置を計算しています。しばらくお待ちください...
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIGenerationModal;
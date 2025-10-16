import React, { useState } from 'react';
import { Share2, Mail, MessageCircle } from 'lucide-react';

interface ShareButtonProps {
  data: string;
  title: string;
  onExport?: () => void;
}

const ShareButton: React.FC<ShareButtonProps> = ({ data, title, onExport }) => {
  const [showOptions, setShowOptions] = useState(false);

  const shareViaEmail = () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(data);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShowOptions(false);
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`${title}\n\n${data}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setShowOptions(false);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <Share2 className="h-4 w-4" />
        <span>Share</span>
      </button>

      {showOptions && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowOptions(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
            {onExport && (
              <button
                onClick={() => {
                  onExport();
                  setShowOptions(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-100 flex items-center space-x-2 border-b"
              >
                <Share2 className="h-4 w-4 text-gray-600" />
                <span>Export PDF</span>
              </button>
            )}
            <button
              onClick={shareViaEmail}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 flex items-center space-x-2 border-b"
            >
              <Mail className="h-4 w-4 text-blue-600" />
              <span>Share via Email</span>
            </button>
            <button
              onClick={shareViaWhatsApp}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 flex items-center space-x-2"
            >
              <MessageCircle className="h-4 w-4 text-green-600" />
              <span>Share via WhatsApp</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ShareButton;

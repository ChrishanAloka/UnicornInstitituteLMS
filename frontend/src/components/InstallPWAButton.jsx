
import React from 'react';
import { usePWA } from '../context/PWAContext';
import { FaDownload } from 'react-icons/fa';
import { motion } from 'framer-motion';

const InstallPWAButton = ({ className, style }) => {
    const { isInstallable, installPWA } = usePWA();

    if (!isInstallable) {
        return null;
    }

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`btn btn-success d-flex align-items-center gap-2 ${className || ''}`}
            onClick={installPWA}
            style={{
                borderRadius: '50px',
                padding: '8px 16px',
                fontWeight: '600',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                zIndex: 1000,
                ...style
            }}
            title="Install App"
        >
            <FaDownload />
            <span>Install App</span>
        </motion.button>
    );
};

export default InstallPWAButton;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Menu, X, Home, History, Settings, FileText, ChevronRight } from 'lucide-react';
import styles from '../styles/StaggeredMenu.module.css';

const menuItems = [
    { title: "Home", Icon: Home, href: "/" },
    { title: "Dashboard", Icon: FileText, href: "/dashboard" },
    { title: "History", Icon: History, href: "#" },
    { title: "Settings", Icon: Settings, href: "#" },
];

const menuVars = {
    initial: {
        scaleY: 0,
        opacity: 0,
    },
    animate: {
        scaleY: 1,
        opacity: 1,
        transition: {
            duration: 0.3,
            ease: [0.12, 0, 0.39, 0],
            staggerChildren: 0.07,
        },
    },
    exit: {
        scaleY: 0,
        opacity: 0,
        transition: {
            delay: 0.2,
            duration: 0.3,
            ease: [0.22, 1, 0.36, 1],
            staggerChildren: 0.05,
            staggerDirection: -1,
        },
    },
};

const itemVars = {
    initial: {
        y: 20,
        opacity: 0,
    },
    animate: {
        y: 0,
        opacity: 1,
    },
    exit: {
        y: 20,
        opacity: 0,
    },
};

const StaggeredMenu = () => {
    const [open, setOpen] = useState(false);

    const toggleMenu = () => {
        setOpen((prev) => !prev);
    };

    return (
        <div className={styles.menuContainer}>
            <button className={styles.menuButton} onClick={toggleMenu}>
                <AnimatePresence exitBeforeEnter>
                    {open ? (
                        <motion.div
                            key="close"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 180 }}
                            transition={{ duration: 0.2 }}
                        >
                            <X size={20} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="menu"
                            initial={{ scale: 0, rotate: 180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: -180 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Menu size={20} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        className={styles.menuDropdown}
                        variants={menuVars}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        {menuItems.map((item, index) => (
                            <Link href={item.href} key={index}>
                                <motion.div
                                    className={styles.menuItem}
                                    variants={itemVars}
                                >
                                    <item.Icon size={18} />
                                    <span>{item.title}</span>
                                    <ChevronRight size={14} className={styles.arrow} />
                                </motion.div>
                            </Link>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StaggeredMenu;

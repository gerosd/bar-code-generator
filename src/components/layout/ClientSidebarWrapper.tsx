'use client'

import { Drawer } from 'flowbite-react'
import React, { useEffect, useState } from 'react'
import Sidebar from './Sidebar'

const ClientSidebarWrapper: React.FC = () => {
    const [open, setOpen] = useState(false)
    const [isMobileView, setIsMobileView] = useState(false)

    const handleClose = () => setOpen(false)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobileView(window.innerWidth < 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        const eventListener = () => {
            setOpen((prevOpen) => !prevOpen)
        }
        document.addEventListener('toggleMobileMenu', eventListener)
        return () => {
            document.removeEventListener('toggleMobileMenu', eventListener)
        }
    }, [])

    if (isMobileView) {
        return (
            <Drawer open={open} onClose={handleClose} position='left' className='w-64'>
                <Sidebar
                    isInsideDrawer={true}
                    closeDrawer={handleClose}
                />
            </Drawer>
        )
    }

    return (
        <div className='hidden md:block'>
            <Sidebar />
        </div>
    )
}

export default ClientSidebarWrapper

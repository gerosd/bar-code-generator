'use client'

import { Drawer } from 'flowbite-react'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'

interface ClientSidebarWrapperProps {
    isAdmin: boolean
    isClientAdmin: boolean
}

const ClientSidebarWrapper: React.FC<ClientSidebarWrapperProps> = ({ isAdmin, isClientAdmin }) => {
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
                    isAdmin={isAdmin}
                    isClientAdmin={isClientAdmin}
                    isInsideDrawer={true}
                    closeDrawer={handleClose}
                />
            </Drawer>
        )
    }

    return (
        <div className='hidden md:block'>
            <Sidebar isAdmin={isAdmin} isClientAdmin={isClientAdmin} />
        </div>
    )
}

export default ClientSidebarWrapper

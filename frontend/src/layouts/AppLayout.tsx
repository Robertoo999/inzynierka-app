import React from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

export default function AppLayout({ children }:{ children: React.ReactNode }){
    return (
        <div className="app-shell" style={{minHeight:'100vh', display:'flex', background:'linear-gradient(180deg,var(--bg), var(--bg-2) 40%, var(--bg))'}}>
            <aside style={{width:260, padding:16, background:'var(--panel)', borderRight:'1px solid var(--line)'}}>
                <Sidebar />
            </aside>
            <div style={{flex:1, display:'flex', flexDirection:'column'}}>
                <header style={{padding:12, background:'var(--panel)', borderBottom:'1px solid var(--line)'}}><Topbar /></header>
                <main style={{flex:1, padding:'16px 20px'}}>
                    <div className="container">{children}</div>
                </main>
            </div>
        </div>
    )
}

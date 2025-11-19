import { Box, Typography, Container } from '@mui/material';
import type { ReactNode } from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface AuthLayoutProps {
    children: ReactNode;
    title: string;
    subtitle?: string;
}

const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
            {/* Left Side - Branding */}
            <Box
                sx={{
                    flex: 1,
                    display: { xs: 'none', md: 'flex' },
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    bgcolor: 'secondary.main',
                    color: 'white',
                    p: 6,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 8 }}>
                        <Box component="img" src="/logo.png" alt="ododocs logo" sx={{ height: 40, width: 'auto' }} />
                        <Typography variant="h5" fontWeight="bold">
                            ododocs
                        </Typography>
                    </Box>

                    <Typography variant="h3" fontWeight="bold" sx={{ mb: 2, maxWidth: '80%' }}>
                        Craft beautiful documents with ease.
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.8, maxWidth: '70%', fontWeight: 400 }}>
                        A modern, block-based editor designed for focus and clarity.
                    </Typography>
                </Box>

                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="body2" sx={{ opacity: 0.6 }}>
                        © 2025 ododocs. All rights reserved.
                    </Typography>
                </Box>

                {/* Abstract Background Pattern */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: '-20%',
                        right: '-20%',
                        width: '80%',
                        height: '80%',
                        background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, rgba(30,41,59,0) 70%)',
                        borderRadius: '50%',
                        filter: 'blur(60px)',
                    }}
                />
            </Box>

            {/* Right Side - Form */}
            <Box
                sx={{
                    flex: { xs: 1, md: '0 0 500px', lg: '0 0 600px' },
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: 'background.default',
                    p: 4,
                }}
            >
                <Container maxWidth="xs">
                    <Box sx={{ mb: 4, textAlign: 'center' }}>
                        <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mb: 2, color: 'primary.main' }}>
                            <AutoAwesomeIcon sx={{ fontSize: 40 }} />
                        </Box>
                        <Typography variant="h4" gutterBottom fontWeight="bold">
                            {title}
                        </Typography>
                        {subtitle && (
                            <Typography variant="body1" color="text.secondary">
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                    {children}
                </Container>
            </Box>
        </Box>
    );
};

export default AuthLayout;

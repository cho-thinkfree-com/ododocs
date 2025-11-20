import { useEffect } from 'react';

export const usePageTitle = (title: string) => {
    useEffect(() => {
        const prevTitle = document.title;
        document.title = `${title} | Tiptap App`;

        return () => {
            document.title = prevTitle;
        };
    }, [title]);
};

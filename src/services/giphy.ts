const GIPHY_API_KEY = 'UkSen4H95lnBPc0pTZlsbuijANBtMnzg'; // Replace with your API key

export interface GiphyGif {
  id: string;
  title: string;
  images: {
    fixed_height: {
      url: string;
      height: string;
      width: string;
    };
    preview_gif: {
      url: string;
    };
  };
}

export const searchGifs = async (query: string): Promise<GiphyGif[]> => {
  if (!query) return [];
  
  try {
    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`
    );
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching GIFs:', error);
    return [];
  }
};

export const getTrendingGifs = async (): Promise<GiphyGif[]> => {
  try {
    const response = await fetch(
      `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=9&rating=g`
    );
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching trending GIFs:', error);
    return [];
  }
}; 
import { GiphyGif } from '../types/index';

const GIPHY_API_KEY = 'UkSen4H95lnBPc0pTZlsbuijANBtMnzg';
const GIPHY_API_URL = 'https://api.giphy.com/v1/gifs';

interface GiphyResponse {
  data: Array<{
    id: string;
    title: string;
    images: {
      fixed_height: {
        url: string;
        width: string;
        height: string;
      };
    };
  }>;
}

export const searchGifs = async (query: string): Promise<GiphyGif[]> => {
  try {
    console.log('Searching GIFs for query:', query);
    const response = await fetch(
      `${GIPHY_API_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`
    );
    
    if (!response.ok) {
      console.error('Giphy API error:', response.status, response.statusText);
      throw new Error(`Giphy API error: ${response.status}`);
    }
    
    const data: GiphyResponse = await response.json();
    console.log('Giphy search results:', data.data);
    
    if (!data.data || !Array.isArray(data.data)) {
      console.error('Invalid response format:', data);
      return [];
    }
    
    return data.data.map((gif) => ({
      id: gif.id,
      title: gif.title,
      images: {
        fixed_height: {
          url: gif.images.fixed_height.url,
          width: parseInt(gif.images.fixed_height.width),
          height: parseInt(gif.images.fixed_height.height)
        }
      }
    }));
  } catch (error) {
    console.error('Error searching GIFs:', error);
    return [];
  }
};

export const getTrendingGifs = async (): Promise<GiphyGif[]> => {
  try {
    console.log('Fetching trending GIFs');
    const response = await fetch(
      `${GIPHY_API_URL}/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`
    );
    
    if (!response.ok) {
      console.error('Giphy API error:', response.status, response.statusText);
      throw new Error(`Giphy API error: ${response.status}`);
    }
    
    const data: GiphyResponse = await response.json();
    console.log('Trending GIFs results:', data.data);
    
    if (!data.data || !Array.isArray(data.data)) {
      console.error('Invalid response format:', data);
      return [];
    }
    
    return data.data.map((gif) => ({
      id: gif.id,
      title: gif.title,
      images: {
        fixed_height: {
          url: gif.images.fixed_height.url,
          width: parseInt(gif.images.fixed_height.width),
          height: parseInt(gif.images.fixed_height.height)
        }
      }
    }));
  } catch (error) {
    console.error('Error fetching trending GIFs:', error);
    return [];
  }
};

export const getGifById = async (id: string): Promise<GiphyGif | null> => {
  try {
    const response = await fetch(
      `${GIPHY_API_URL}/${id}?api_key=${GIPHY_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch GIF: ${response.statusText}`);
    }

    const data: GiphyResponse = await response.json();
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      throw new Error('Invalid response format from Giphy API');
    }

    const gif = data.data[0];
    return {
      id: gif.id,
      title: gif.title,
      images: {
        fixed_height: {
          url: gif.images.fixed_height.url,
          width: parseInt(gif.images.fixed_height.width),
          height: parseInt(gif.images.fixed_height.height)
        }
      }
    };
  } catch (error) {
    console.error('Error fetching GIF by ID:', error);
    return null;
  }
}; 
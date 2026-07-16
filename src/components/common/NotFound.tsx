import Link from 'next/link';

export const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-4 text-center">
      <h2 className="text-4xl font-bold text-gray-900 mb-2">404</h2>
      <h3 className="text-xl font-medium text-gray-700 mb-4">Page not found</h3>
      <p className="text-gray-500 mb-8 max-w-md">
        Sorry, we couldn't find the page you're looking for. It might have been removed, renamed, or did not exist in the first place.
      </p>
      <Link 
        href="/"
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
      >
        Go back home
      </Link>
    </div>
  );
};

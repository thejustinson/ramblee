import Image from "next/image";

interface NavigationProps {
  onInstallClick: () => void;
}

export default function Navigation({ onInstallClick }: NavigationProps) {
  return (
    <header className="flex items-center justify-between mb-16 sm:mb-20">
      <div className="text-xl sm:text-2xl font-bold text-[#002F6D] flex gap-2">
        <Image
          src="/logo.png"
          alt="Ramblee Logo"
          width={269.8}
          height={236.1}
          className="grow-0 shrink-0 h-[calc(236.1px/8)] w-[calc(269.8px/8)]"
        />
        <span>ramblee</span>
      </div>
      <button
        onClick={onInstallClick}
        className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-full hover:border-[#002F6D] hover:text-[#002F6D] transition-all duration-300 hidden lg:block"
      >
        Install Ramblee
      </button>
    </header>
  );
}

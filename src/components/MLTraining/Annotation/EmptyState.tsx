
interface EmptyStateProps {
  message: string;
}

const EmptyState = ({ message }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] border-2 border-dashed rounded-lg">
      <p className="text-gray-500">{message}</p>
    </div>
  );
};

export default EmptyState;

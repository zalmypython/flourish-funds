import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { useApiAuth } from '@/hooks/useApiAuth';
import { useToast } from '@/hooks/use-toast';

export interface ApiDocument {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const useApiFirestore = <T extends ApiDocument>(endpoint: string) => {
  const { user } = useApiAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all documents
  const { data: documents = [], isLoading: loading } = useQuery({
    queryKey: [endpoint, user?.id],
    queryFn: async () => {
      const response = await apiClient.get(`/${endpoint}`);
      return response.data as T[];
    },
    enabled: !!user,
  });

  // Add document mutation
  const addDocumentMutation = useMutation({
    mutationFn: async (data: Omit<T, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiClient.post(`/${endpoint}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint, user?.id] });
      toast({
        title: "Success",
        description: "Document added successfully!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to add document",
        variant: "destructive"
      });
    }
  });

  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<T> }) => {
      const response = await apiClient.put(`/${endpoint}/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint, user?.id] });
      toast({
        title: "Success",
        description: "Document updated successfully!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update document",
        variant: "destructive"
      });
    }
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/${endpoint}/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint, user?.id] });
      toast({
        title: "Success",
        description: "Document deleted successfully!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete document",
        variant: "destructive"
      });
    }
  });

  return {
    documents,
    loading,
    addDocument: addDocumentMutation.mutate,
    updateDocument: (id: string, data: Partial<T>) => updateDocumentMutation.mutate({ id, data }),
    deleteDocument: deleteDocumentMutation.mutate,
    isAdding: addDocumentMutation.isPending,
    isUpdating: updateDocumentMutation.isPending,
    isDeleting: deleteDocumentMutation.isPending
  };
};
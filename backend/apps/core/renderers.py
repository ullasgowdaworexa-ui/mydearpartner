from rest_framework.renderers import JSONRenderer

class StandardizedJSONRenderer(JSONRenderer):
    """
    Standardized API response format for all JSON responses:
    {
      "success": boolean,
      "message": string,
      "data": object or list or null,
      "errors": object or null
    }
    """
    def render(self, data, accepted_media_type=None, renderer_context=None):
        status_code = 200
        exception = False
        
        if renderer_context:
            response = renderer_context.get('response')
            if response:
                status_code = response.status_code
                exception = response.exception

        # Initialize default payload values
        success = 200 <= status_code < 300
        message = "Request completed successfully."
        errors = None
        payload_data = data

        if exception:
            success = False
            message = "An error occurred while processing the request."
            payload_data = None
            
            # Format validation or application errors
            if isinstance(data, dict):
                if 'detail' in data:
                    message = data.pop('detail')
                errors = data
            elif isinstance(data, list):
                errors = {'non_field_errors': data}
            else:
                errors = {'error': str(data)}
        else:
            # Custom status code message adjustment if data has a custom message keys
            if isinstance(data, dict):
                if 'message' in data and len(data) <= 3:
                    message = data.pop('message')
                if 'success' in data and len(data) <= 2:
                    success = data.pop('success')
                if 'data' in data and len(data) <= 1:
                    payload_data = data.get('data')

        response_dict = {
            'success': success,
            'message': message,
            'data': payload_data,
            'errors': errors
        }

        return super().render(response_dict, accepted_media_type, renderer_context)

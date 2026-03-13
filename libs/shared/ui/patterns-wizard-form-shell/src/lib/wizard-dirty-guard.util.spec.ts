import { FormControl, FormGroup } from '@angular/forms';
import { firstValueFrom, of } from 'rxjs';

import { canDeactivateWizard } from './wizard-dirty-guard.util';

describe('canDeactivateWizard', () => {
  it('deve permitir saída quando não está dirty', async () => {
    const result = await firstValueFrom(
      canDeactivateWizard({
        isDirty: () => false,
      })
    );

    expect(result).toBe(true);
  });

  it('deve negar saída quando dirty e sem canExit', async () => {
    const result = await firstValueFrom(
      canDeactivateWizard({
        isDirty: () => true,
      })
    );

    expect(result).toBe(false);
  });

  it('deve aceitar canExit com Observable e repassar form', async () => {
    const form = new FormGroup({
      nome: new FormControl('ok'),
    });
    const canExit = jest.fn().mockImplementation(({ form: received }) => {
      expect(received).toBe(form);
      return of(true);
    });

    const result = await firstValueFrom(
      canDeactivateWizard({
        isDirty: () => true,
        form,
        getActiveStepId: () => 'dados',
        canExit,
      })
    );

    expect(result).toBe(true);
    expect(canExit).toHaveBeenCalledTimes(1);
  });
});
